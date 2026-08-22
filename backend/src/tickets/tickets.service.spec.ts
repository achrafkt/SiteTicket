import { ForbiddenException } from '@nestjs/common';
import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectHubAccessService } from '../project-hub/project-hub-access.service';
import { StorageService } from '../storage/storage.service';
import { TicketAuthorizationContext } from './tickets-permissions.service';
import { TicketsPermissionsService } from './tickets-permissions.service';
import { TicketActor, TicketsService } from './tickets.service';

// sanitize-html's dependency htmlparser2@12 is ESM-only, which Jest's default
// (untransformed) node_modules handling can't load. None of the scenarios
// below exercise addComment/updateComment (the only callers of
// sanitizeCommentHtml), so the real implementation is stubbed out here rather
// than widening the project's Jest transform config for an unrelated path.
jest.mock('../common/sanitize-comment-html', () => ({
  sanitizeCommentHtml: jest.fn((text: string) => text),
}));

// The qse chantier used throughout: the actor is a member of QSE_CHANTIER but
// not of OTHER_CHANTIER, mirroring the manually-validated regression scenario
// ("PATCH/DELETE sur ticket SAFETY hors chantier -> 403").
const QSE_CHANTIER = 'chantier-qse-member';
const OTHER_CHANTIER = 'chantier-not-a-member';

function buildTicketRecord(
  projectId: string,
  overrides: Partial<TicketAuthorizationContext> = {},
): TicketAuthorizationContext {
  return {
    project_id: projectId,
    created_by: 'someone-else',
    assigned_to: null,
    status_id: 'status-1',
    ticket_type: { code: 'SAFETY' },
    ...overrides,
  };
}

describe('TicketsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let permissions: jest.Mocked<TicketsPermissionsService>;
  let access: jest.Mocked<ProjectHubAccessService>;
  let notifications: jest.Mocked<NotificationsService>;
  let storage: jest.Mocked<StorageService>;
  let service: TicketsService;

  const qseActor: TicketActor = { id: 'qse-1', role: RoleCode.qse };
  const adminActor: TicketActor = { id: 'admin-1', role: RoleCode.admin };

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    permissions = {
      canModifyTicket: jest.fn(),
      canAssignTicket: jest.fn(),
      canDeleteTicket: jest.fn(),
    } as unknown as jest.Mocked<TicketsPermissionsService>;
    access = {
      assertCanView: jest.fn(),
    } as unknown as jest.Mocked<ProjectHubAccessService>;
    notifications = {
      notifyTicketAssigned: jest.fn(),
      notifyStatusChanged: jest.fn(),
      notifyMention: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    storage = {
      remove: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    service = new TicketsService(
      prisma as unknown as PrismaService,
      permissions,
      notifications,
      access,
      storage,
    );
  });

  describe('update()', () => {
    it('rejects with 403 when a qse user tries to PATCH a SAFETY ticket outside their chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockRejectedValue(
        new ForbiddenException('Vous n’avez pas accès à ce chantier.'),
      );

      await expect(
        service.update('ticket-1', { title: 'Nouveau titre' }, qseActor),
      ).rejects.toThrow(ForbiddenException);

      expect(access.assertCanView).toHaveBeenCalledWith(OTHER_CHANTIER, qseActor);
      // The chantier check must short-circuit before the scope check runs.
      expect(permissions.canModifyTicket).not.toHaveBeenCalled();
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('succeeds when a qse user PATCHes a SAFETY ticket in their own chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
      prisma.ticket.update.mockResolvedValue({
        id: 'ticket-1',
        title: 'Nouveau titre',
      } as never);

      const result = await service.update(
        'ticket-1',
        { title: 'Nouveau titre' },
        qseActor,
      );

      expect(result).toEqual({ id: 'ticket-1', title: 'Nouveau titre' });
      expect(access.assertCanView).toHaveBeenCalledWith(QSE_CHANTIER, qseActor);
      expect(permissions.canModifyTicket).toHaveBeenCalled();
    });

    it('always authorizes admin to PATCH a ticket in any chantier (no broad-view regression)', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER, { ticket_type: { code: 'DELAY' } }) as never,
      );
      access.assertCanView.mockResolvedValue(undefined); // no-op for broad-view roles
      permissions.canModifyTicket.mockResolvedValue(true);
      prisma.ticket.update.mockResolvedValue({ id: 'ticket-1' } as never);

      await expect(
        service.update('ticket-1', { title: 'Titre admin' }, adminActor),
      ).resolves.toEqual({ id: 'ticket-1' });
    });
  });

  describe('remove()', () => {
    it('rejects with 403 when a qse user tries to DELETE a SAFETY ticket outside their chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockRejectedValue(
        new ForbiddenException('Vous n’avez pas accès à ce chantier.'),
      );

      await expect(service.remove('ticket-1', qseActor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(permissions.canDeleteTicket).not.toHaveBeenCalled();
      expect(prisma.ticket.delete).not.toHaveBeenCalled();
    });

    it('succeeds when a qse user DELETEs a SAFETY ticket in their own chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canDeleteTicket.mockResolvedValue(true);
      prisma.ticketAttachment.findMany.mockResolvedValue([]);
      prisma.ticket.delete.mockResolvedValue({ id: 'ticket-1' } as never);

      const result = await service.remove('ticket-1', qseActor);

      expect(result).toEqual({ success: true });
      expect(prisma.ticket.delete).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
      });
    });

    it('always authorizes admin to DELETE a ticket in any chantier (no broad-view regression)', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canDeleteTicket.mockResolvedValue(true);
      prisma.ticketAttachment.findMany.mockResolvedValue([]);
      prisma.ticket.delete.mockResolvedValue({ id: 'ticket-1' } as never);

      await expect(service.remove('ticket-1', adminActor)).resolves.toEqual({
        success: true,
      });
    });
  });

  // addTag/addSubtask/addLink all funnel through the private ensureCanModify(),
  // which runs the same assertCanView-then-scope sequence as update()/remove().
  describe('ensureCanModify() via addTag/addSubtask/addLink', () => {
    it('addTag rejects with 403 outside the chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(
        service.addTag('ticket-1', { label: 'urgent' }, qseActor),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.ticketTag.create).not.toHaveBeenCalled();
    });

    it('addSubtask rejects with 403 outside the chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(
        service.addSubtask('ticket-1', { label: 'Vérifier EPI' }, qseActor),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.ticketSubtask.create).not.toHaveBeenCalled();
    });

    it('addLink rejects with 403 outside the chantier', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(OTHER_CHANTIER) as never,
      );
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(
        service.addLink(
          'ticket-1',
          { linkedTicketId: 'ticket-2' },
          qseActor,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.ticketLink.create).not.toHaveBeenCalled();
    });

    it('addTag succeeds when the qse user belongs to the chantier and the ticket is SAFETY', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
      prisma.ticketTag.create.mockResolvedValue({
        id: 'tag-1',
        label: 'urgent',
      } as never);

      const result = await service.addTag(
        'ticket-1',
        { label: 'urgent' },
        qseActor,
      );

      expect(result).toEqual({ id: 'tag-1', label: 'urgent' });
    });
  });
});
