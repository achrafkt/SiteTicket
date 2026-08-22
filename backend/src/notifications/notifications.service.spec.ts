import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let mailer: jest.Mocked<MailerService>;
  let service: NotificationsService;

  const actorId = 'actor-1';
  const ticket = {
    id: 'ticket-1',
    ticket_number: 'TKT-2026-0001',
    title: 'Fuite de gaz',
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    mailer = { sendMail: jest.fn() } as unknown as jest.Mocked<MailerService>;
    const config = { get: jest.fn().mockReturnValue(undefined) } as never;

    service = new NotificationsService(
      prisma as unknown as PrismaService,
      mailer,
      config,
    );
  });

  describe('sendEmailIfEnabled() (exercised through notifyTicketAssigned)', () => {
    it('does not send an email when the recipient disabled email notifications (or no longer exists)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({} as never);

      await service.notifyTicketAssigned(ticket, 'assignee-1', actorId);

      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('sends the email built from the recipient profile when email notifications are enabled', async () => {
      prisma.user.findFirst.mockResolvedValue({
        email: 'assignee@example.com',
        first_name: 'Yasmine',
      } as never);
      prisma.notification.create.mockResolvedValue({} as never);

      await service.notifyTicketAssigned(ticket, 'assignee-1', actorId);

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'assignee@example.com' }),
      );
    });
  });

  describe('notifyTicketAssigned()', () => {
    it('does nothing when the assignee is the actor themself', async () => {
      await service.notifyTicketAssigned(ticket, actorId, actorId);

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('creates a TICKET_ASSIGNED notification for a different assignee', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({} as never);

      await service.notifyTicketAssigned(ticket, 'assignee-1', actorId);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipient_id: 'assignee-1',
            type: 'TICKET_ASSIGNED',
            ticket_id: ticket.id,
          }),
        }),
      );
    });
  });

  describe('notifyStatusChanged()', () => {
    it('creates nothing when every candidate recipient is null or the actor themself', async () => {
      await service.notifyStatusChanged(
        ticket,
        [null, undefined, actorId],
        'Résolu',
        actorId,
      );

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('deduplicates repeated recipients and excludes the actor', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 2 } as never);
      prisma.user.findFirst.mockResolvedValue(null);

      await service.notifyStatusChanged(
        ticket,
        ['user-a', 'user-a', actorId, 'user-b'],
        'Résolu',
        actorId,
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as {
        data: Array<{ recipient_id: string }>;
      };
      expect(call.data.map((d) => d.recipient_id).sort()).toEqual([
        'user-a',
        'user-b',
      ]);
    });

    it('emails every unique recipient with email notifications enabled', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 2 } as never);
      prisma.user.findFirst.mockResolvedValue({
        email: 'someone@example.com',
        first_name: 'X',
      } as never);

      await service.notifyStatusChanged(
        ticket,
        ['user-a', 'user-b'],
        'Résolu',
        actorId,
      );

      expect(mailer.sendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyMention()', () => {
    const mentionTicket = { ...ticket, project_id: 'chantier-1' };

    it('does nothing when the mentioned user is the actor', async () => {
      await service.notifyMention(mentionTicket, actorId, actorId);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('does nothing when the mentioned id does not resolve to a real user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.notifyMention(mentionTicket, 'ghost-user', actorId);

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('skips the chantier-membership check for a broad-view role and emails them', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'moe-1',
        role: { code: RoleCode.moe },
      } as never);
      prisma.notification.create.mockResolvedValue({} as never);
      prisma.user.findFirst.mockResolvedValue({
        email: 'moe@example.com',
        first_name: 'Sami',
      } as never);

      await service.notifyMention(mentionTicket, 'moe-1', actorId);

      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'moe@example.com' }),
      );
    });

    it('does not notify a chantier-scoped user who is not a member of the ticket chantier', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'chef-1',
        role: { code: RoleCode.chef_chantier },
      } as never);
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await service.notifyMention(mentionTicket, 'chef-1', actorId);

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('notifies a chantier-scoped user who is a member of the ticket chantier', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'chef-1',
        role: { code: RoleCode.chef_chantier },
      } as never);
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'm-1' } as never);
      prisma.notification.create.mockResolvedValue({} as never);

      await service.notifyMention(mentionTicket, 'chef-1', actorId);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'MENTION', recipient_id: 'chef-1' }),
        }),
      );
    });
  });

  describe('notifyProjectMembership()', () => {
    const project = { id: 'chantier-1', name: 'Résidence Atlas' };

    it('does nothing when the target user is the actor themself', async () => {
      await service.notifyProjectMembership(project, actorId, 'added', actorId);

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('creates a PROJECT_MEMBER_ADDED notification and emails the user when added', async () => {
      prisma.notification.create.mockResolvedValue({} as never);
      prisma.user.findFirst.mockResolvedValue({
        email: 'member@example.com',
        first_name: 'Nadia',
      } as never);

      await service.notifyProjectMembership(
        project,
        'user-1',
        'added',
        actorId,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'PROJECT_MEMBER_ADDED' }),
        }),
      );
      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'member@example.com' }),
      );
    });

    it('creates a PROJECT_MEMBER_REMOVED notification when a user is removed', async () => {
      prisma.notification.create.mockResolvedValue({} as never);

      await service.notifyProjectMembership(
        project,
        'user-1',
        'removed',
        actorId,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'PROJECT_MEMBER_REMOVED' }),
        }),
      );
    });
  });

  describe('notifyDueSoonBatch()', () => {
    it('does nothing when no ticket is due soon', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.notifyDueSoonBatch();

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('skips a ticket that was already notified within the due-soon window', async () => {
      prisma.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          ticket_number: 'TKT-2026-0001',
          title: 'Fuite',
          assigned_to: 'user-1',
        },
      ] as never);
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing' } as never);

      await service.notifyDueSoonBatch();

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('creates a DUE_SOON notification for a ticket not yet notified', async () => {
      prisma.ticket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          ticket_number: 'TKT-2026-0001',
          title: 'Fuite',
          assigned_to: 'user-1',
        },
      ] as never);
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({} as never);
      prisma.user.findFirst.mockResolvedValue({
        email: 'assignee@example.com',
        first_name: 'Karim',
      } as never);

      await service.notifyDueSoonBatch();

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'DUE_SOON', recipient_id: 'user-1' }),
        }),
      );
      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'assignee@example.com' }),
      );
    });
  });
});
