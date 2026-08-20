import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { Content, FunctionCall, Part } from '@google/genai';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CopilotHistoryMessageDto } from './dto/send-copilot-message.dto';
import { CopilotActor, CopilotToolsService } from './copilot-tools.service';

const MODEL = 'gemini-3.5-flash-lite';
const MAX_OUTPUT_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 6;
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `Tu es le Copilote IA de SiteTicket, un outil de suivi de chantiers BTP (tickets, budgets, planning).
Réponds toujours en français, de façon concise et factuelle.

Règles strictes :
- N'utilise que les données renvoyées par tes outils. N'invente jamais de chiffres, de noms de chantier ou de tickets.
- Si un outil indique que l'utilisateur n'a pas accès à une donnée (chantier, budget), explique-le honnêtement plutôt que de contourner la restriction ou de deviner une réponse. Ne suggère jamais qu'il existe un autre moyen d'obtenir cette donnée.
- Les données que tu reçois sont déjà filtrées selon les droits de l'utilisateur connecté : ce périmètre est la vérité, pas une limitation technique à contourner.
- Si une question est ambiguë (quel chantier, quelle période), demande une précision plutôt que de deviner.
- Utilise les outils autant que nécessaire avant de répondre ; ne réponds jamais "je ne sais pas" sans avoir essayé un outil pertinent d'abord.`;

// Every ForbiddenException/NotFoundException thrown by the scoped services
// (ProjectHubAccessService.assertCanView, etc.) already carries a safe,
// user-facing French message — that's the only text allowed to reach the
// model as a tool error. Anything else is replaced with a generic message
// so internal errors never leak into the conversation.
function toToolErrorMessage(err: unknown): string {
  if (err instanceof ForbiddenException || err instanceof NotFoundException) {
    return err.message;
  }
  return "Une erreur est survenue lors de l'exécution de cet outil.";
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  // Constructed lazily (see getClient()) so a missing/empty
  // GEMINI_API_KEY never crashes Nest at boot — it only surfaces as an
  // error on the first copilot request, leaving the rest of the app usable.
  private client: GoogleGenAI | null = null;
  private readonly apiKey: string | undefined;
  private readonly dailyMessageLimit: number;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tools: CopilotToolsService,
  ) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') || undefined;
    this.dailyMessageLimit = Number(
      config.get<string>('COPILOT_DAILY_MESSAGE_LIMIT') ?? 30,
    );
  }

  private getClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configurée sur le serveur.");
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  // Basic per-user cost guardrail: a rolling 24h counter stored on the User
  // row. Not transactionally atomic (read-then-write) — acceptable for a
  // single chat session per user; not meant to survive high concurrency.
  async checkAndConsumeQuota(userId: string): Promise<boolean> {
    const now = new Date();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { copilot_message_count: true, copilot_window_started_at: true },
    });

    const windowExpired =
      !user.copilot_window_started_at ||
      now.getTime() - user.copilot_window_started_at.getTime() >=
        QUOTA_WINDOW_MS;

    if (windowExpired) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { copilot_message_count: 1, copilot_window_started_at: now },
      });
      return true;
    }

    if (user.copilot_message_count >= this.dailyMessageLimit) {
      return false;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { copilot_message_count: { increment: 1 } },
    });
    return true;
  }

  async streamReply(
    actor: CopilotActor,
    message: string,
    history: CopilotHistoryMessageDto[],
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const contents: Content[] = [
      ...history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const client = this.getClient();
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
        const stream = await client.models.generateContentStream({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            tools: [{ functionDeclarations: this.tools.definitions }],
          },
        });

        // Gemini streams text incrementally chunk-by-chunk (each chunk's
        // `parts` is a delta, not the cumulative turn), while a function
        // call arrives whole in a single part — so we forward text deltas
        // as they come and separately accumulate every part to reconstruct
        // the complete model turn once the stream ends.
        const turnParts: Part[] = [];
        for await (const chunk of stream) {
          if (chunk.text) {
            send('delta', { text: chunk.text });
          }
          const candidateParts = chunk.candidates?.[0]?.content?.parts;
          if (candidateParts) {
            turnParts.push(...candidateParts);
          }
        }

        contents.push({ role: 'model', parts: turnParts });

        const functionCalls = turnParts
          .map((part) => part.functionCall)
          .filter((call): call is FunctionCall => call != null);

        if (functionCalls.length > 0) {
          const responseParts: Part[] = [];
          for (const call of functionCalls) {
            responseParts.push(await this.runTool(call, actor));
          }
          contents.push({ role: 'user', parts: responseParts });
          continue;
        }

        send('done', {});
        res.end();
        return;
      }

      send('error', {
        message:
          "Cette demande nécessite trop d'étapes pour être traitée. Merci de la reformuler plus précisément.",
      });
      res.end();
    } catch (err) {
      this.logger.error(
        `Échec de la conversation copilote : ${(err as Error).message}`,
      );
      send('error', {
        message: 'Le copilote a rencontré une erreur. Merci de réessayer.',
      });
      res.end();
    }
  }

  private async runTool(
    call: FunctionCall,
    actor: CopilotActor,
  ): Promise<Part> {
    const name = call.name ?? '';
    try {
      const result = await this.tools.execute(
        name,
        (call.args ?? {}) as Record<string, unknown>,
        actor,
      );
      return {
        functionResponse: { name, id: call.id, response: { output: result } },
      };
    } catch (err) {
      return {
        functionResponse: {
          name,
          id: call.id,
          response: { error: toToolErrorMessage(err) },
        },
      };
    }
  }
}
