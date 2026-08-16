import { Injectable } from '@nestjs/common';
import { Prisma, TicketPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectHubAccessService, ProjectHubActor } from '../project-hub/project-hub-access.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

const PRIORITY_ORDER: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

type ScopedTicket = {
  id: string;
  priority: TicketPriority;
  created_at: Date;
  resolved_at: Date | null;
  closed_at: Date | null;
  due_date: Date | null;
  project_id: string;
  cost_impact_amount: Prisma.Decimal | null;
  schedule_impact_days: number | null;
  status: { code: string; name: string; sort_order: number; is_terminal: boolean };
  ticket_type: { code: string; name: string };
  assigned_to_user: { id: string; first_name: string; last_name: string } | null;
};

// Mirrors web/src/lib/ticket-rules.ts#isTicketOverdue — due date covers the
// whole day, and a terminal ticket is never overdue.
function isOverdue(ticket: Pick<ScopedTicket, 'due_date' | 'status'>, now: Date): boolean {
  if (!ticket.due_date || ticket.status.is_terminal) return false;
  const due = new Date(ticket.due_date);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

function resolutionDate(ticket: Pick<ScopedTicket, 'resolved_at' | 'closed_at'>): Date | null {
  return ticket.resolved_at ?? ticket.closed_at ?? null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectHubAccessService,
  ) {}

  async getTicketAnalytics(query: AnalyticsQueryDto, actor: ProjectHubActor) {
    if (query.projectId) {
      await this.access.assertCanView(query.projectId, actor);
    }

    const visibilityFilter = await this.access.visibleProjectIdsFilter(actor);
    const canSeeBudget = this.access.canSeeBudget(actor);

    const visibleProjects = await this.prisma.project.findMany({
      where: visibilityFilter,
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    const visibleProjectIds = visibleProjects.map((project) => project.id);

    const ticketWhere: Prisma.TicketWhereInput = {
      project_id: query.projectId ?? { in: visibleProjectIds },
      ...(query.ticketTypeId ? { ticket_type_id: query.ticketTypeId } : {}),
    };

    const scopedTickets = (await this.prisma.ticket.findMany({
      where: ticketWhere,
      select: {
        id: true,
        priority: true,
        created_at: true,
        resolved_at: true,
        closed_at: true,
        due_date: true,
        project_id: true,
        cost_impact_amount: true,
        schedule_impact_days: true,
        status: { select: { code: true, name: true, sort_order: true, is_terminal: true } },
        ticket_type: { select: { code: true, name: true } },
        assigned_to_user: { select: { id: true, first_name: true, last_name: true } },
      },
    })) as ScopedTicket[];

    const now = new Date();
    const to = query.to ? new Date(query.to) : now;
    const earliestCreatedAt = scopedTickets.reduce<Date | null>(
      (min, ticket) => (!min || ticket.created_at < min ? ticket.created_at : min),
      null,
    );
    const from = query.from
      ? new Date(query.from)
      : (earliestCreatedAt ?? new Date(to.getTime() - DEFAULT_RANGE_MS));

    // "En retard" is always evaluated against the live state of in-scope
    // tickets (project/type filters), independent of the date-range filter —
    // an overdue ticket created before the selected period is still overdue
    // today, and hiding it behind a "last 7 days" filter would be misleading.
    const overdue = scopedTickets.filter((ticket) => isOverdue(ticket, now)).length;

    const periodTickets = query.from || query.to
      ? scopedTickets.filter((ticket) => ticket.created_at >= from && ticket.created_at <= to)
      : scopedTickets;

    const kpis = this.buildKpis(periodTickets, overdue);
    const byStatus = this.buildByStatus(periodTickets);
    const byPriority = this.buildByPriority(periodTickets);
    const byType = this.buildByType(periodTickets);
    const avgResolutionByType = this.buildAvgResolutionByType(periodTickets);
    const byAssignee = this.buildByAssignee(periodTickets);
    const byProject = this.buildByProject(periodTickets, visibleProjects);
    const volumeOverTime = this.buildVolumeOverTime(scopedTickets, from, to);
    const budgetByProject = canSeeBudget
      ? await this.buildBudgetByProject(query.projectId ? [query.projectId] : visibleProjectIds)
      : null;
    const impactByProject = canSeeBudget
      ? this.buildImpactByProject(periodTickets, visibleProjects)
      : null;

    return {
      visibleProjects,
      kpis,
      byStatus,
      volumeOverTime,
      byPriority,
      byType,
      avgResolutionByType,
      byAssignee,
      byProject,
      budgetByProject,
      impactByProject,
    };
  }

  private buildKpis(tickets: ScopedTicket[], overdue: number) {
    const total = tickets.length;
    const open = tickets.filter((ticket) => !ticket.status.is_terminal).length;
    const resolved = tickets.filter((ticket) => ticket.status.is_terminal);
    const resolutionRate = total === 0 ? 0 : Math.round((resolved.length / total) * 1000) / 10;

    const resolutionDurationsHours = resolved
      .map((ticket) => {
        const resolvedAt = resolutionDate(ticket);
        return resolvedAt ? (resolvedAt.getTime() - ticket.created_at.getTime()) / (60 * 60 * 1000) : null;
      })
      .filter((hours): hours is number => hours !== null && hours >= 0);

    const avgResolutionHours = resolutionDurationsHours.length
      ? Math.round(
          (resolutionDurationsHours.reduce((sum, hours) => sum + hours, 0) /
            resolutionDurationsHours.length) *
            10,
        ) / 10
      : null;

    return { total, open, resolutionRate, avgResolutionHours, overdue };
  }

  private buildByStatus(tickets: ScopedTicket[]) {
    const counts = new Map<string, { statusCode: string; statusName: string; sortOrder: number; count: number }>();
    for (const ticket of tickets) {
      const existing = counts.get(ticket.status.code);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(ticket.status.code, {
          statusCode: ticket.status.code,
          statusName: ticket.status.name,
          sortOrder: ticket.status.sort_order,
          count: 1,
        });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ statusCode, statusName, count }) => ({ statusCode, statusName, count }));
  }

  private buildByPriority(tickets: ScopedTicket[]) {
    const counts = new Map<TicketPriority, number>();
    for (const ticket of tickets) {
      counts.set(ticket.priority, (counts.get(ticket.priority) ?? 0) + 1);
    }
    return PRIORITY_ORDER.map((priority) => ({ priority, count: counts.get(priority) ?? 0 }));
  }

  private buildByType(tickets: ScopedTicket[]) {
    const counts = new Map<string, { typeCode: string; typeName: string; count: number }>();
    for (const ticket of tickets) {
      const existing = counts.get(ticket.ticket_type.code);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(ticket.ticket_type.code, {
          typeCode: ticket.ticket_type.code,
          typeName: ticket.ticket_type.name,
          count: 1,
        });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }

  private buildAvgResolutionByType(tickets: ScopedTicket[]) {
    const buckets = new Map<string, { typeCode: string; typeName: string; hours: number[] }>();
    for (const ticket of tickets) {
      const resolvedAt = resolutionDate(ticket);
      if (!resolvedAt) continue;
      const hours = (resolvedAt.getTime() - ticket.created_at.getTime()) / (60 * 60 * 1000);
      if (hours < 0) continue;

      const key = ticket.ticket_type.code;
      const existing = buckets.get(key);
      if (existing) {
        existing.hours.push(hours);
      } else {
        buckets.set(key, { typeCode: key, typeName: ticket.ticket_type.name, hours: [hours] });
      }
    }
    return Array.from(buckets.values())
      .map(({ typeCode, typeName, hours }) => ({
        typeCode,
        typeName,
        avgHours: Math.round((hours.reduce((sum, h) => sum + h, 0) / hours.length) * 10) / 10,
      }))
      .sort((a, b) => b.avgHours - a.avgHours);
  }

  private buildByAssignee(tickets: ScopedTicket[]) {
    const UNASSIGNED_KEY = 'unassigned';
    const counts = new Map<string, { personId: string | null; name: string; count: number }>();

    for (const ticket of tickets) {
      const key = ticket.assigned_to_user?.id ?? UNASSIGNED_KEY;
      const name = ticket.assigned_to_user
        ? `${ticket.assigned_to_user.first_name} ${ticket.assigned_to_user.last_name}`
        : 'Non assigné';
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { personId: ticket.assigned_to_user?.id ?? null, name, count: 1 });
      }
    }

    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    const TOP_N = 8;
    if (sorted.length <= TOP_N) return sorted;

    const top = sorted.slice(0, TOP_N);
    const others = sorted.slice(TOP_N).reduce((sum, entry) => sum + entry.count, 0);
    return [...top, { personId: null, name: 'Autres', count: others }];
  }

  private buildByProject(
    tickets: ScopedTicket[],
    visibleProjects: { id: string; name: string; code: string }[],
  ) {
    const counts = new Map<string, { open: number; resolved: number }>();
    for (const ticket of tickets) {
      const entry = counts.get(ticket.project_id) ?? { open: 0, resolved: 0 };
      if (ticket.status.is_terminal) {
        entry.resolved += 1;
      } else {
        entry.open += 1;
      }
      counts.set(ticket.project_id, entry);
    }

    return visibleProjects
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        open: counts.get(project.id)?.open ?? 0,
        resolved: counts.get(project.id)?.resolved ?? 0,
      }))
      .filter((entry) => entry.open > 0 || entry.resolved > 0);
  }

  private buildImpactByProject(
    tickets: ScopedTicket[],
    visibleProjects: { id: string; name: string; code: string }[],
  ) {
    const totals = new Map<string, { costImpactTotal: number; scheduleImpactDaysTotal: number }>();
    for (const ticket of tickets) {
      const entry = totals.get(ticket.project_id) ?? { costImpactTotal: 0, scheduleImpactDaysTotal: 0 };
      entry.costImpactTotal += ticket.cost_impact_amount ? Number(ticket.cost_impact_amount) : 0;
      entry.scheduleImpactDaysTotal += ticket.schedule_impact_days ?? 0;
      totals.set(ticket.project_id, entry);
    }

    return visibleProjects
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        costImpactTotal: totals.get(project.id)?.costImpactTotal ?? 0,
        scheduleImpactDaysTotal: totals.get(project.id)?.scheduleImpactDaysTotal ?? 0,
      }))
      .filter((entry) => entry.costImpactTotal !== 0 || entry.scheduleImpactDaysTotal !== 0);
  }

  private buildVolumeOverTime(tickets: ScopedTicket[], from: Date, to: Date) {
    const buckets: { bucketStart: Date; created: number; resolved: number }[] = [];
    let cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);

    while (cursor <= end) {
      buckets.push({ bucketStart: new Date(cursor), created: 0, resolved: 0 });
      cursor = new Date(cursor.getTime() + WEEK_MS);
    }
    if (buckets.length === 0) {
      buckets.push({ bucketStart: new Date(from), created: 0, resolved: 0 });
    }

    const bucketFor = (date: Date) => {
      for (let i = buckets.length - 1; i >= 0; i -= 1) {
        if (date >= buckets[i].bucketStart) return buckets[i];
      }
      return buckets[0];
    };

    for (const ticket of tickets) {
      if (ticket.created_at >= from && ticket.created_at <= to) {
        bucketFor(ticket.created_at).created += 1;
      }
      const resolvedAt = resolutionDate(ticket);
      if (resolvedAt && resolvedAt >= from && resolvedAt <= to) {
        bucketFor(resolvedAt).resolved += 1;
      }
    }

    return buckets.map(({ bucketStart, created, resolved }) => ({
      bucket: bucketStart.toISOString().slice(0, 10),
      created,
      resolved,
    }));
  }

  private async buildBudgetByProject(projectIds: string[]) {
    if (projectIds.length === 0) return [];

    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        budget_planned: true,
        expenses: { select: { amount: true } },
      },
    });

    return projects.map((project) => {
      const spent = project.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const planned = project.budget_planned === null ? null : Number(project.budget_planned);
      return {
        projectId: project.id,
        projectName: project.name,
        planned,
        spent,
        variance: planned === null ? null : planned - spent,
      };
    });
  }
}

export type { ProjectHubActor as AnalyticsActor };
