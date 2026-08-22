import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { CopilotConversationsService } from './copilot-conversations.service';
import { CopilotService } from './copilot.service';
import { CopilotToolsService } from './copilot-tools.service';

// See tickets.service.spec.ts: sanitize-html's dependency htmlparser2@12 is
// ESM-only and gets pulled in transitively via CopilotToolsService ->
// TicketsService even though only checkAndConsumeQuota() is under test here.
jest.mock('../common/sanitize-comment-html', () => ({
  sanitizeCommentHtml: jest.fn((text: string) => text),
}));

// streamReply() (the SSE + Gemini tool-calling loop) is intentionally not
// covered here — it needs a mocked Express Response and a mocked Gemini
// async-iterator stream, which is a lot of scaffolding for a thin
// orchestration method whose real logic (tool dispatch, error mapping) is
// already covered in copilot-tools.service.spec.ts and toToolErrorMessage's
// callers. checkAndConsumeQuota() is self-contained business logic and is
// fully covered below.
describe('CopilotService.checkAndConsumeQuota()', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: CopilotService;

  const userId = 'user-1';

  function buildService(dailyLimit = 2) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'COPILOT_DAILY_MESSAGE_LIMIT') return String(dailyLimit);
        return undefined;
      }),
    } as never;
    const tools = {} as CopilotToolsService;
    const conversations = {} as CopilotConversationsService;

    return new CopilotService(config, prisma as unknown as PrismaService, tools, conversations);
  }

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = buildService();
  });

  it('resets the rolling window and allows the message when no window has started yet', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      copilot_message_count: 0,
      copilot_window_started_at: null,
    } as never);

    const allowed = await service.checkAndConsumeQuota(userId);

    expect(allowed).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ copilot_message_count: 1 }),
      }),
    );
  });

  it('resets the rolling window and allows the message once the 24h window has expired', async () => {
    const expiredWindowStart = new Date(Date.now() - 25 * 60 * 60 * 1000);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      copilot_message_count: 2,
      copilot_window_started_at: expiredWindowStart,
    } as never);

    const allowed = await service.checkAndConsumeQuota(userId);

    expect(allowed).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ copilot_message_count: 1 }),
      }),
    );
  });

  it('increments the counter and allows the message when still under the daily limit', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      copilot_message_count: 1,
      copilot_window_started_at: new Date(),
    } as never);

    const allowed = await service.checkAndConsumeQuota(userId);

    expect(allowed).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { copilot_message_count: { increment: 1 } },
      }),
    );
  });

  it('refuses the message without incrementing once the daily limit is reached', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      copilot_message_count: 2,
      copilot_window_started_at: new Date(),
    } as never);

    const allowed = await service.checkAndConsumeQuota(userId);

    expect(allowed).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
