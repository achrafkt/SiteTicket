import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { hasBroadProjectView } from '../common/permissions/project-hub-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

interface NotifiableTicket {
  id: string;
  ticket_number: string;
  title: string;
}

interface MentionableTicket extends NotifiableTicket {
  project_id: string;
}

interface NotifiableProject {
  id: string;
  name: string;
}

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  created_at: true,
  read_at: true,
  ticket: { select: { id: true, ticket_number: true } },
  project: { select: { id: true, name: true } },
} as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string, query: ListNotificationsQueryDto) {
    return this.prisma.notification.findMany({
      where: {
        recipient_id: userId,
        ...(query.unreadOnly ? { read_at: null } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: query.limit ?? 50,
      select: notificationSelect,
    });
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { recipient_id: userId, read_at: null },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipient_id: userId, read_at: null },
      data: { read_at: new Date() },
    });

    if (result.count === 0) {
      // Either the notification doesn't exist, belongs to someone else, or was
      // already read. Only distinguish "belongs to someone else / missing" as a
      // 404 — re-marking an already-read notification is a harmless no-op.
      const exists = await this.prisma.notification.findFirst({
        where: { id, recipient_id: userId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Notification introuvable.');
      }
    }

    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipient_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return { success: true };
  }

  async notifyTicketAssigned(
    ticket: NotifiableTicket,
    assigneeId: string,
    actorId: string,
  ) {
    if (assigneeId === actorId) return;

    await this.prisma.notification.create({
      data: {
        recipient_id: assigneeId,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigné',
        message: `Le ticket ${ticket.ticket_number} — ${ticket.title} vous a été assigné.`,
        actor_id: actorId,
        ticket_id: ticket.id,
      },
    });
  }

  async notifyStatusChanged(
    ticket: NotifiableTicket,
    recipientIds: Array<string | null | undefined>,
    statusLabel: string,
    actorId: string,
  ) {
    const uniqueRecipients = Array.from(
      new Set(recipientIds.filter((id): id is string => Boolean(id))),
    ).filter((id) => id !== actorId);

    if (uniqueRecipients.length === 0) return;

    await this.prisma.notification.createMany({
      data: uniqueRecipients.map((recipientId) => ({
        recipient_id: recipientId,
        type: 'STATUS_CHANGED' as const,
        title: 'Statut modifié',
        message: `Le ticket ${ticket.ticket_number} — ${ticket.title} est passé à « ${statusLabel} ».`,
        actor_id: actorId,
        ticket_id: ticket.id,
      })),
    });
  }

  async notifyMention(
    ticket: MentionableTicket,
    mentionedUserId: string,
    actorId: string,
  ) {
    if (mentionedUserId === actorId) return;

    // The id comes straight from client-supplied comment HTML — resolve the
    // real user (and role) before doing anything else, both to notify only
    // real accounts and to decide chantier scoping below.
    const user = await this.prisma.user.findUnique({
      where: { id: mentionedUserId },
      select: { id: true, role: { select: { code: true } } },
    });
    if (!user) return;

    // Mentions are scoped to this ticket's chantier: either an explicit
    // ProjectMember row, or one of the cross-chantier oversight roles that
    // already see every chantier elsewhere in the app (project hub, tickets'
    // 'project_member' scope). Mirrors PROJECT_HUB_BROAD_VIEW_ROLES so the
    // mention autocomplete and the notification it triggers stay in sync.
    if (!hasBroadProjectView(user.role.code)) {
      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          project_id_user_id: {
            project_id: ticket.project_id,
            user_id: mentionedUserId,
          },
        },
        select: { id: true },
      });
      if (!isMember) return;
    }

    await this.prisma.notification.create({
      data: {
        recipient_id: mentionedUserId,
        type: 'MENTION',
        title: 'Vous avez été mentionné',
        message: `Vous avez été mentionné dans un commentaire sur le ticket ${ticket.ticket_number} — ${ticket.title}.`,
        actor_id: actorId,
        ticket_id: ticket.id,
      },
    });
  }

  async notifyProjectMembership(
    project: NotifiableProject,
    targetUserId: string,
    kind: 'added' | 'removed',
    actorId: string,
  ) {
    if (targetUserId === actorId) return;

    await this.prisma.notification.create({
      data: {
        recipient_id: targetUserId,
        type:
          kind === 'added' ? 'PROJECT_MEMBER_ADDED' : 'PROJECT_MEMBER_REMOVED',
        title:
          kind === 'added' ? 'Ajouté à un chantier' : "Retiré d'un chantier",
        message:
          kind === 'added'
            ? `Vous avez été ajouté au chantier ${project.name}.`
            : `Vous avez été retiré du chantier ${project.name}.`,
        actor_id: actorId,
        project_id: project.id,
      },
    });
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async notifyDueSoonBatch() {
    const threshold = new Date(Date.now() + DUE_SOON_WINDOW_MS);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        assigned_to: { not: null },
        due_date: { not: null, lte: threshold },
        status: { is_terminal: false },
      },
      select: {
        id: true,
        ticket_number: true,
        title: true,
        assigned_to: true,
      },
    });

    for (const ticket of tickets) {
      const recipientId = ticket.assigned_to;
      if (!recipientId) continue;

      const alreadyNotified = await this.prisma.notification.findFirst({
        where: {
          ticket_id: ticket.id,
          recipient_id: recipientId,
          type: 'DUE_SOON',
          created_at: { gte: new Date(Date.now() - DUE_SOON_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      await this.prisma.notification.create({
        data: {
          recipient_id: recipientId,
          type: 'DUE_SOON',
          title: 'Échéance proche',
          message: `Le ticket ${ticket.ticket_number} — ${ticket.title} arrive à échéance bientôt.`,
          ticket_id: ticket.id,
        },
      });
    }

    if (tickets.length > 0) {
      this.logger.log(
        `Vérification des échéances : ${tickets.length} ticket(s) examiné(s).`,
      );
    }
  }
}
