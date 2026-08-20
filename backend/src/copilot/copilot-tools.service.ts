import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { TicketPriority, TicketStatusCode } from '@prisma/client';
import {
  ProjectHubAccessService,
  ProjectHubActor,
} from '../project-hub/project-hub-access.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TicketsService } from '../tickets/tickets.service';

export type CopilotActor = ProjectHubActor;

const MAX_KNOWLEDGE_RESULTS = 10;

function isTicketStatusCode(value: unknown): value is TicketStatusCode {
  return (
    typeof value === 'string' &&
    (Object.values(TicketStatusCode) as string[]).includes(value)
  );
}

function isTicketPriority(value: unknown): value is TicketPriority {
  return (
    typeof value === 'string' &&
    (Object.values(TicketPriority) as string[]).includes(value)
  );
}

// Every tool handler below is scoped through the same services the REST
// endpoints use (ProjectHubAccessService / TicketsService / AnalyticsService
// / KnowledgeService) — never a raw Prisma query. `actor` always comes from
// the authenticated request's CurrentUser, never from the model's tool
// input, so no tool input_schema below defines a userId/role field.
@Injectable()
export class CopilotToolsService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly analyticsService: AnalyticsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly access: ProjectHubAccessService,
  ) {}

  readonly definitions: Anthropic.Tool[] = [
    {
      name: 'search_tickets',
      description:
        "Recherche des tickets visibles par l'utilisateur courant, avec filtres optionnels (chantier, statut, priorité, assignation, caractère bloquant). Ne renvoie jamais de ticket hors du périmètre de l'utilisateur.",
      input_schema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description:
              "UUID du chantier. Si absent, recherche sur tous les chantiers visibles par l'utilisateur.",
          },
          statusCode: {
            type: 'string',
            enum: Object.values(TicketStatusCode),
            description: 'Code de statut du ticket.',
          },
          priority: {
            type: 'string',
            enum: Object.values(TicketPriority),
            description: 'Priorité du ticket.',
          },
          isBlocking: {
            type: 'boolean',
            description:
              'Filtrer uniquement les tickets bloquants (true) ou non-bloquants (false).',
          },
          assignedToUserId: {
            type: 'string',
            description: "UUID de l'utilisateur assigné.",
          },
          limit: {
            type: 'integer',
            description: 'Nombre maximum de résultats (défaut 20, max 50).',
          },
        },
      },
    },
    {
      name: 'get_budget_summary',
      description:
        "Résumé budgétaire (planifié, dépensé, écart, impact coût/délai des tickets) pour un ou plusieurs chantiers visibles par l'utilisateur. Si l'utilisateur n'a pas le droit de voir les budgets, l'outil le signale explicitement plutôt que de renvoyer une valeur.",
      input_schema: {
        type: 'object',
        properties: {
          projectIds: {
            type: 'array',
            items: { type: 'string' },
            description:
              "UUIDs des chantiers. Si absent, tous les chantiers visibles par l'utilisateur.",
          },
        },
      },
    },
    {
      name: 'get_ticket_analytics',
      description:
        "Analytics déjà calculées sur les tickets (répartition par statut/priorité/type, temps moyen de résolution, charge par assigné, volume dans le temps) pour un chantier ou l'ensemble des chantiers visibles.",
      input_schema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description:
              'UUID du chantier. Si absent, agrège sur tous les chantiers visibles.',
          },
          from: {
            type: 'string',
            description: 'Date ISO de début de période.',
          },
          to: { type: 'string', description: 'Date ISO de fin de période.' },
          ticketTypeId: {
            type: 'string',
            description: 'UUID du type de ticket.',
          },
        },
      },
    },
    {
      name: 'search_knowledge_base',
      description:
        "Recherche dans les articles de la base de connaissances visibles par le rôle de l'utilisateur (titre, contenu, catégorie).",
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termes de recherche.' },
          limit: {
            type: 'integer',
            description: 'Nombre maximum de résultats (défaut 10, max 10).',
          },
        },
        required: ['query'],
      },
    },
  ];

  async execute(
    name: string,
    input: Record<string, unknown>,
    actor: CopilotActor,
  ): Promise<unknown> {
    switch (name) {
      case 'search_tickets':
        return this.searchTickets(input, actor);
      case 'get_budget_summary':
        return this.getBudgetSummary(input, actor);
      case 'get_ticket_analytics':
        return this.getTicketAnalyticsSummary(input, actor);
      case 'search_knowledge_base':
        return this.searchKnowledgeBase(input, actor);
      default:
        throw new Error(`Outil inconnu : ${name}`);
    }
  }

  private async searchTickets(
    input: Record<string, unknown>,
    actor: CopilotActor,
  ) {
    const tickets = await this.ticketsService.search(
      {
        projectId:
          typeof input.projectId === 'string' ? input.projectId : undefined,
        statusCode: isTicketStatusCode(input.statusCode)
          ? input.statusCode
          : undefined,
        priority: isTicketPriority(input.priority) ? input.priority : undefined,
        isBlocking:
          typeof input.isBlocking === 'boolean' ? input.isBlocking : undefined,
        assignedToUserId:
          typeof input.assignedToUserId === 'string'
            ? input.assignedToUserId
            : undefined,
        limit: typeof input.limit === 'number' ? input.limit : undefined,
      },
      actor,
    );

    return tickets.map((ticket) => ({
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      isBlocking: ticket.is_blocking,
      status: ticket.status.name,
      dueDate: ticket.due_date,
      project: ticket.project.name,
      type: ticket.ticket_type.name,
      assignedTo: ticket.assigned_to_user
        ? `${ticket.assigned_to_user.first_name} ${ticket.assigned_to_user.last_name}`
        : null,
    }));
  }

  private async getBudgetSummary(
    input: Record<string, unknown>,
    actor: CopilotActor,
  ) {
    if (!this.access.canSeeBudget(actor)) {
      return {
        error:
          "Vous n'avez pas les droits nécessaires pour consulter le budget des chantiers.",
      };
    }

    const projectIds = Array.isArray(input.projectIds)
      ? input.projectIds.filter((id): id is string => typeof id === 'string')
      : [];

    if (projectIds.length === 0) {
      const analytics = await this.analyticsService.getTicketAnalytics(
        {},
        actor,
      );
      return {
        kpis: analytics.kpis,
        budgetByProject: analytics.budgetByProject,
        impactByProject: analytics.impactByProject,
      };
    }

    const results: unknown[] = [];
    for (const projectId of projectIds) {
      try {
        const analytics = await this.analyticsService.getTicketAnalytics(
          { projectId },
          actor,
        );
        results.push({
          projectId,
          budget: analytics.budgetByProject,
          impact: analytics.impactByProject,
        });
      } catch (err) {
        results.push({
          projectId,
          error: err instanceof Error ? err.message : 'Accès refusé.',
        });
      }
    }
    return results;
  }

  private async getTicketAnalyticsSummary(
    input: Record<string, unknown>,
    actor: CopilotActor,
  ) {
    const analytics = await this.analyticsService.getTicketAnalytics(
      {
        projectId:
          typeof input.projectId === 'string' ? input.projectId : undefined,
        from: typeof input.from === 'string' ? input.from : undefined,
        to: typeof input.to === 'string' ? input.to : undefined,
        ticketTypeId:
          typeof input.ticketTypeId === 'string'
            ? input.ticketTypeId
            : undefined,
      },
      actor,
    );

    const { budgetByProject, impactByProject, ...rest } = analytics;
    void budgetByProject;
    void impactByProject;
    return rest;
  }

  private async searchKnowledgeBase(
    input: Record<string, unknown>,
    actor: CopilotActor,
  ) {
    const query =
      typeof input.query === 'string' ? input.query.trim().toLowerCase() : '';
    if (!query) return [];

    const limit = Math.min(
      typeof input.limit === 'number' ? input.limit : MAX_KNOWLEDGE_RESULTS,
      MAX_KNOWLEDGE_RESULTS,
    );
    const articles = await this.knowledgeService.findAllArticles(actor);

    return articles
      .filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          article.category.name.toLowerCase().includes(query),
      )
      .slice(0, limit)
      .map((article) => ({
        title: article.title,
        category: article.category.name,
        excerpt: article.content.slice(0, 300),
      }));
  }
}
