import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  ProjectHubAccessService,
  ProjectHubActor,
} from '../project-hub/project-hub-access.service';
import { TicketsService } from '../tickets/tickets.service';
import { CopilotToolsService } from './copilot-tools.service';

// See tickets.service.spec.ts: sanitize-html's dependency htmlparser2@12 is
// ESM-only, which Jest can't load through the untransformed node_modules
// path pulled in transitively via TicketsService. TicketsService itself is
// mocked below, so the real implementation is never exercised here.
jest.mock('../common/sanitize-comment-html', () => ({
  sanitizeCommentHtml: jest.fn((text: string) => text),
}));

describe('CopilotToolsService', () => {
  let ticketsService: jest.Mocked<TicketsService>;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let knowledgeService: jest.Mocked<KnowledgeService>;
  let access: jest.Mocked<ProjectHubAccessService>;
  let service: CopilotToolsService;

  const actor: ProjectHubActor = { id: 'user-1', role: RoleCode.chef_chantier };

  beforeEach(() => {
    ticketsService = { search: jest.fn() } as unknown as jest.Mocked<TicketsService>;
    analyticsService = {
      getTicketAnalytics: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsService>;
    knowledgeService = {
      findAllArticles: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeService>;
    access = { canSeeBudget: jest.fn() } as unknown as jest.Mocked<ProjectHubAccessService>;

    service = new CopilotToolsService(
      ticketsService,
      analyticsService,
      knowledgeService,
      access,
    );
  });

  describe('execute()', () => {
    it('throws for an unknown tool name', async () => {
      await expect(service.execute('bogus_tool', {}, actor)).rejects.toThrow(
        'Outil inconnu : bogus_tool',
      );
    });
  });

  describe('search_tickets', () => {
    it('delegates to TicketsService.search (which owns the chantier scoping) and maps the result for the model', async () => {
      ticketsService.search.mockResolvedValue([
        {
          ticket_number: 'TKT-2026-0001',
          title: 'Fuite',
          priority: 'high',
          is_blocking: true,
          due_date: null,
          status: { name: 'Ouvert' },
          project: { name: 'Résidence Atlas' },
          ticket_type: { name: 'Sécurité' },
          assigned_to_user: { first_name: 'Yasmine', last_name: 'B.' },
        },
      ] as never);

      const [result] = (await service.execute(
        'search_tickets',
        { projectId: 'chantier-1' },
        actor,
      )) as Array<Record<string, unknown>>;

      expect(ticketsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'chantier-1' }),
        actor,
      );
      expect(result).toEqual({
        ticketNumber: 'TKT-2026-0001',
        title: 'Fuite',
        priority: 'high',
        isBlocking: true,
        status: 'Ouvert',
        dueDate: null,
        project: 'Résidence Atlas',
        type: 'Sécurité',
        assignedTo: 'Yasmine B.',
      });
    });

    it('ignores malformed filter types from the model instead of passing them through', async () => {
      ticketsService.search.mockResolvedValue([]);

      await service.execute(
        'search_tickets',
        { statusCode: 123, priority: {}, isBlocking: 'yes' },
        actor,
      );

      expect(ticketsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: undefined,
          priority: undefined,
          isBlocking: undefined,
        }),
        actor,
      );
    });

    it('reports null assignedTo for an unassigned ticket', async () => {
      ticketsService.search.mockResolvedValue([
        {
          ticket_number: 'TKT-2026-0002',
          title: 'Fissure',
          priority: 'medium',
          is_blocking: false,
          due_date: null,
          status: { name: 'Ouvert' },
          project: { name: 'Résidence Atlas' },
          ticket_type: { name: 'Structure' },
          assigned_to_user: null,
        },
      ] as never);

      const [result] = (await service.execute(
        'search_tickets',
        {},
        actor,
      )) as Array<Record<string, unknown>>;

      expect(result.assignedTo).toBeNull();
    });
  });

  describe('get_budget_summary', () => {
    it('returns an explicit error object instead of data when the role cannot see the budget', async () => {
      access.canSeeBudget.mockReturnValue(false);

      const result = await service.execute('get_budget_summary', {}, actor);

      expect(result).toEqual({
        error:
          "Vous n'avez pas les droits nécessaires pour consulter le budget des chantiers.",
      });
      expect(analyticsService.getTicketAnalytics).not.toHaveBeenCalled();
    });

    it('aggregates analytics across every visible chantier when no projectIds are given', async () => {
      access.canSeeBudget.mockReturnValue(true);
      analyticsService.getTicketAnalytics.mockResolvedValue({
        kpis: { total: 10 },
        budgetByProject: [{ projectId: 'p1' }],
        impactByProject: [{ projectId: 'p1' }],
      } as never);

      const result = await service.execute('get_budget_summary', {}, actor);

      expect(analyticsService.getTicketAnalytics).toHaveBeenCalledWith({}, actor);
      expect(result).toEqual({
        kpis: { total: 10 },
        budgetByProject: [{ projectId: 'p1' }],
        impactByProject: [{ projectId: 'p1' }],
      });
    });

    it('queries analytics per chantier and collects one entry per requested projectId', async () => {
      access.canSeeBudget.mockReturnValue(true);
      analyticsService.getTicketAnalytics.mockResolvedValue({
        budgetByProject: { spent: 100 },
        impactByProject: { costImpact: 50 },
      } as never);

      const result = await service.execute(
        'get_budget_summary',
        { projectIds: ['p1', 'p2'] },
        actor,
      );

      expect(analyticsService.getTicketAnalytics).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { projectId: 'p1', budget: { spent: 100 }, impact: { costImpact: 50 } },
        { projectId: 'p2', budget: { spent: 100 }, impact: { costImpact: 50 } },
      ]);
    });

    it('swallows a per-chantier access error and reports it inline instead of failing the whole batch', async () => {
      access.canSeeBudget.mockReturnValue(true);
      analyticsService.getTicketAnalytics
        .mockResolvedValueOnce({
          budgetByProject: { spent: 10 },
          impactByProject: {},
        } as never)
        .mockRejectedValueOnce(
          new ForbiddenException('Vous n’avez pas accès à ce chantier.'),
        );

      const result = await service.execute(
        'get_budget_summary',
        { projectIds: ['visible-chantier', 'forbidden-chantier'] },
        actor,
      );

      expect(result).toEqual([
        {
          projectId: 'visible-chantier',
          budget: { spent: 10 },
          impact: {},
        },
        {
          projectId: 'forbidden-chantier',
          error: 'Vous n’avez pas accès à ce chantier.',
        },
      ]);
    });
  });

  describe('get_ticket_analytics', () => {
    it('strips budget and impact figures from the analytics summary returned to the model', async () => {
      analyticsService.getTicketAnalytics.mockResolvedValue({
        byStatus: { open: 5 },
        budgetByProject: { spent: 100 },
        impactByProject: { costImpact: 20 },
      } as never);

      const result = (await service.execute(
        'get_ticket_analytics',
        {},
        actor,
      )) as Record<string, unknown>;

      expect(result).toEqual({ byStatus: { open: 5 } });
      expect(result).not.toHaveProperty('budgetByProject');
      expect(result).not.toHaveProperty('impactByProject');
    });
  });

  describe('search_knowledge_base', () => {
    function article(
      overrides: Partial<{ title: string; content: string; category: string }>,
    ) {
      return {
        title: overrides.title ?? 'Article',
        content: overrides.content ?? 'Contenu générique',
        category: { name: overrides.category ?? 'Général' },
      };
    }

    it('returns an empty array without querying anything for a blank query', async () => {
      const result = await service.execute(
        'search_knowledge_base',
        { query: '   ' },
        actor,
      );

      expect(result).toEqual([]);
      expect(knowledgeService.findAllArticles).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on title, content, or category name', async () => {
      knowledgeService.findAllArticles.mockResolvedValue([
        article({ title: 'Procédure ÉCHAFAUDAGE' }),
        article({ content: 'utiliser un échafaudage certifié' }),
        article({ category: 'Échafaudage' }),
        article({ title: 'Sans rapport' }),
      ] as never);

      const result = (await service.execute(
        'search_knowledge_base',
        { query: 'échafaudage' },
        actor,
      )) as unknown[];

      expect(result).toHaveLength(3);
    });

    it('caps the result count at the requested limit, itself capped at 10', async () => {
      knowledgeService.findAllArticles.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) =>
          article({ title: `Sécurité ${i}` }),
        ) as never,
      );

      const uncapped = (await service.execute(
        'search_knowledge_base',
        { query: 'sécurité', limit: 100 },
        actor,
      )) as unknown[];
      const capped = (await service.execute(
        'search_knowledge_base',
        { query: 'sécurité', limit: 3 },
        actor,
      )) as unknown[];

      expect(uncapped).toHaveLength(10);
      expect(capped).toHaveLength(3);
    });

    it('returns a title/category/excerpt summary with content truncated to 300 characters', async () => {
      knowledgeService.findAllArticles.mockResolvedValue([
        article({ content: 'x'.repeat(500) }),
      ] as never);

      const [result] = (await service.execute(
        'search_knowledge_base',
        { query: 'article' },
        actor,
      )) as Array<{ excerpt: string }>;

      expect(result.excerpt).toHaveLength(300);
    });
  });
});
