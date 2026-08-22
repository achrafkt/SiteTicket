import { ForbiddenException } from '@nestjs/common';
import { Prisma, PrismaClient, RoleCode } from '@prisma/client';
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
      canCreateTicket: jest.fn(),
      canCommentOnTicket: jest.fn(),
      canViewInternalComments: jest.fn(),
      canDeleteAttachment: jest.fn(),
      canEditComment: jest.fn(),
      canDeleteComment: jest.fn(),
    } as unknown as jest.Mocked<TicketsPermissionsService>;
    access = {
      assertCanView: jest.fn(),
      visibleProjectIdsFilter: jest.fn(),
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

  describe('findAll()', () => {
    it('scopes the query to visible chantiers when the actor is chantier-scoped', async () => {
      const filter = { members: { some: { user_id: qseActor.id } } };
      access.visibleProjectIdsFilter.mockResolvedValue(filter as never);
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.findAll(qseActor);

      const call = prisma.ticket.findMany.mock.calls[0][0] as {
        where?: { project?: unknown };
      };
      expect(call.where).toEqual({ project: filter });
    });

    it('does not filter by project for a broad-view role', async () => {
      access.visibleProjectIdsFilter.mockResolvedValue(undefined);
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.findAll(adminActor);

      const call = prisma.ticket.findMany.mock.calls[0][0] as {
        where?: unknown;
      };
      expect(call.where).toBeUndefined();
    });

    it('excludes internal comments from the preview select for a role without internal visibility', async () => {
      access.visibleProjectIdsFilter.mockResolvedValue(undefined);
      permissions.canViewInternalComments.mockReturnValue(false);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.findAll(qseActor);

      const call = prisma.ticket.findMany.mock.calls[0][0] as {
        select: { comments: { where?: unknown } };
      };
      expect(call.select.comments.where).toEqual({ is_internal: false });
    });
  });

  describe('findOne()', () => {
    function ticketWithLinks() {
      return {
        id: 'ticket-1',
        project: { id: QSE_CHANTIER },
        links_from: [{ linked_ticket: { id: 'linked-a' } }],
        links_to: [{ ticket: { id: 'linked-b' } }],
      };
    }

    it('throws NotFound when the ticket does not exist', async () => {
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing', qseActor)).rejects.toThrow(
        'Ticket introuvable.',
      );
    });

    it('throws Forbidden when the actor cannot view the ticket chantier', async () => {
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticket.findUnique.mockResolvedValue(ticketWithLinks() as never);
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(service.findOne('ticket-1', qseActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('merges links_from and links_to into a single links array', async () => {
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticket.findUnique.mockResolvedValue(ticketWithLinks() as never);
      access.assertCanView.mockResolvedValue(undefined);

      const result = await service.findOne('ticket-1', qseActor);

      expect(result.links).toEqual([{ id: 'linked-a' }, { id: 'linked-b' }]);
      expect(result).not.toHaveProperty('links_from');
      expect(result).not.toHaveProperty('links_to');
    });

    it('excludes internal comments from the select for a role without internal visibility', async () => {
      permissions.canViewInternalComments.mockReturnValue(false);
      prisma.ticket.findUnique.mockResolvedValue(ticketWithLinks() as never);
      access.assertCanView.mockResolvedValue(undefined);

      await service.findOne('ticket-1', qseActor);

      const call = prisma.ticket.findUnique.mock.calls[0][0] as {
        select: { comments: { where?: unknown } };
      };
      expect(call.select.comments.where).toEqual({ is_internal: false });
    });
  });

  describe('create()', () => {
    function baseDto() {
      return {
        projectId: QSE_CHANTIER,
        ticketTypeId: 'type-1',
        title: 'Fuite de gaz',
      };
    }

    beforeEach(() => {
      prisma.project.findUnique.mockResolvedValue({ id: QSE_CHANTIER } as never);
      prisma.ticketType.findUnique.mockResolvedValue({ id: 'type-1' } as never);
      prisma.user.findUnique.mockResolvedValue({ id: 'some-user' } as never);
      prisma.ticketStatus.findFirst.mockResolvedValue({
        id: 'status-new',
      } as never);
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.create.mockResolvedValue({
        id: 'ticket-new',
        assigned_to: null,
      } as never);
      prisma.ticketStatusHistory.create.mockResolvedValue({} as never);
      access.assertCanView.mockResolvedValue(undefined);
    });

    it('throws Forbidden before checking chantier access when the role cannot create tickets', async () => {
      permissions.canCreateTicket.mockReturnValue(false);

      await expect(service.create(baseDto(), qseActor)).rejects.toThrow(
        'Votre rôle ne permet pas de créer un ticket.',
      );
      expect(access.assertCanView).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the target project does not exist', async () => {
      permissions.canCreateTicket.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto(), qseActor)).rejects.toThrow(
        'Le projet sélectionné est introuvable.',
      );
    });

    it('throws BadRequest when no NEW initial status is configured', async () => {
      permissions.canCreateTicket.mockReturnValue(true);
      prisma.ticketStatus.findFirst.mockResolvedValue(null);

      await expect(service.create(baseDto(), qseActor)).rejects.toThrow(
        "Le statut initial n'est pas disponible.",
      );
    });

    it('creates the ticket, logs the initial status history, and does not notify anyone when unassigned', async () => {
      permissions.canCreateTicket.mockReturnValue(true);

      const result = await service.create(baseDto(), qseActor);

      expect(result).toEqual({ id: 'ticket-new', assigned_to: null });
      expect(prisma.ticketStatusHistory.create).toHaveBeenCalled();
      expect(notifications.notifyTicketAssigned).not.toHaveBeenCalled();
    });

    it('notifies the assignee when the ticket is created with an assignedTo', async () => {
      permissions.canCreateTicket.mockReturnValue(true);
      prisma.ticket.create.mockResolvedValue({
        id: 'ticket-new',
        assigned_to: 'assignee-1',
      } as never);

      await service.create(
        { ...baseDto(), assignedTo: 'assignee-1' },
        qseActor,
      );

      expect(notifications.notifyTicketAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-new' }),
        'assignee-1',
        qseActor.id,
      );
    });

    it('throws BadRequest when a plan position is given without a planId', async () => {
      permissions.canCreateTicket.mockReturnValue(true);

      await expect(
        service.create({ ...baseDto(), planX: 0.5 }, qseActor),
      ).rejects.toThrow('Un plan doit être sélectionné pour positionner ce ticket.');
      expect(prisma.ticket.create).not.toHaveBeenCalled();
    });

    it("throws BadRequest when the selected plan does not belong to the ticket's chantier", async () => {
      permissions.canCreateTicket.mockReturnValue(true);
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        project_id: 'a-different-chantier',
      } as never);

      await expect(
        service.create({ ...baseDto(), planId: 'plan-1' }, qseActor),
      ).rejects.toThrow("Ce plan n'appartient pas au chantier de ce ticket.");
    });
  });

  describe('addComment()', () => {
    function baseTicket() {
      return {
        id: 'ticket-1',
        ticket_number: 'TKT-2026-0001',
        title: 'Fuite',
        project_id: QSE_CHANTIER,
      };
    }

    it('throws NotFound when the ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment('missing', { commentText: 'Salut' }, qseActor),
      ).rejects.toThrow('Ticket introuvable.');
    });

    it('throws Forbidden when the role cannot comment on tickets', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket() as never);
      permissions.canCommentOnTicket.mockReturnValue(false);

      await expect(
        service.addComment('ticket-1', { commentText: 'Salut' }, qseActor),
      ).rejects.toThrow('Votre rôle ne permet pas de commenter ce ticket.');
    });

    it('forces isInternal to false for a role without internal-comment visibility, regardless of the request', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket() as never);
      permissions.canCommentOnTicket.mockReturnValue(true);
      permissions.canViewInternalComments.mockReturnValue(false);
      prisma.ticketComment.create.mockResolvedValue({ id: 'c-1' } as never);

      await service.addComment(
        'ticket-1',
        { commentText: 'Salut', isInternal: true },
        qseActor,
      );

      const call = prisma.ticketComment.create.mock.calls[0][0] as {
        data: { is_internal: boolean };
      };
      expect(call.data.is_internal).toBe(false);
    });

    it('defaults isInternal to true for a role that can view internal comments when unspecified', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket() as never);
      permissions.canCommentOnTicket.mockReturnValue(true);
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticketComment.create.mockResolvedValue({ id: 'c-1' } as never);

      await service.addComment('ticket-1', { commentText: 'Salut' }, qseActor);

      const call = prisma.ticketComment.create.mock.calls[0][0] as {
        data: { is_internal: boolean };
      };
      expect(call.data.is_internal).toBe(true);
    });

    it('notifies every user mentioned in the sanitized comment body', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket() as never);
      permissions.canCommentOnTicket.mockReturnValue(true);
      permissions.canViewInternalComments.mockReturnValue(true);
      prisma.ticketComment.create.mockResolvedValue({ id: 'c-1' } as never);

      const mentionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      await service.addComment(
        'ticket-1',
        {
          commentText: `<span data-mention-user-id="${mentionId}">@Untel</span>`,
        },
        qseActor,
      );

      expect(notifications.notifyMention).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        mentionId,
        qseActor.id,
      );
    });
  });

  describe('updateComment()', () => {
    function existingComment(overrides: Record<string, unknown> = {}) {
      return {
        id: 'comment-1',
        ticket_id: 'ticket-1',
        user_id: qseActor.id,
        created_at: new Date(),
        deleted_at: null,
        ...overrides,
      };
    }

    it('throws NotFound when the comment does not exist', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateComment(
          'ticket-1',
          'missing',
          { commentText: 'edit' },
          qseActor,
        ),
      ).rejects.toThrow('Commentaire introuvable.');
    });

    it('throws NotFound when the comment belongs to a different ticket', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment({ ticket_id: 'another-ticket' }) as never,
      );

      await expect(
        service.updateComment(
          'ticket-1',
          'comment-1',
          { commentText: 'edit' },
          qseActor,
        ),
      ).rejects.toThrow('Commentaire introuvable.');
    });

    it('throws NotFound when the comment was already soft-deleted', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment({ deleted_at: new Date() }) as never,
      );

      await expect(
        service.updateComment(
          'ticket-1',
          'comment-1',
          { commentText: 'edit' },
          qseActor,
        ),
      ).rejects.toThrow('Commentaire introuvable.');
    });

    it('throws Forbidden when canEditComment refuses (wrong author or edit window expired)', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment() as never,
      );
      permissions.canEditComment.mockReturnValue(false);

      await expect(
        service.updateComment(
          'ticket-1',
          'comment-1',
          { commentText: 'edit' },
          qseActor,
        ),
      ).rejects.toThrow(
        'Vous ne pouvez modifier votre commentaire que dans les 15 minutes suivant sa publication.',
      );
    });

    it('updates the comment when within the author edit window', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment() as never,
      );
      permissions.canEditComment.mockReturnValue(true);
      prisma.ticketComment.update.mockResolvedValue({
        id: 'comment-1',
        comment_text: 'edit',
      } as never);

      const result = await service.updateComment(
        'ticket-1',
        'comment-1',
        { commentText: 'edit' },
        qseActor,
      );

      expect(result).toEqual({ id: 'comment-1', comment_text: 'edit' });
    });
  });

  describe('removeComment()', () => {
    function existingComment(overrides: Record<string, unknown> = {}) {
      return {
        id: 'comment-1',
        ticket_id: 'ticket-1',
        user_id: qseActor.id,
        created_at: new Date(),
        deleted_at: null,
        ...overrides,
      };
    }

    it('throws NotFound when the comment does not exist or belongs to another ticket', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment({ ticket_id: 'another-ticket' }) as never,
      );

      await expect(
        service.removeComment('ticket-1', 'comment-1', qseActor),
      ).rejects.toThrow('Commentaire introuvable.');
    });

    it('is idempotent for an already-deleted comment and skips the permission check', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment({ deleted_at: new Date() }) as never,
      );

      const result = await service.removeComment(
        'ticket-1',
        'comment-1',
        qseActor,
      );

      expect(result).toEqual({ success: true });
      expect(permissions.canDeleteComment).not.toHaveBeenCalled();
      expect(prisma.ticketComment.update).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the role cannot delete this comment', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment() as never,
      );
      permissions.canDeleteComment.mockReturnValue(false);

      await expect(
        service.removeComment('ticket-1', 'comment-1', qseActor),
      ).rejects.toThrow('Votre rôle ne permet pas de supprimer ce commentaire.');
    });

    it('soft-deletes the comment and returns success', async () => {
      prisma.ticketComment.findUnique.mockResolvedValue(
        existingComment() as never,
      );
      permissions.canDeleteComment.mockReturnValue(true);
      prisma.ticketComment.update.mockResolvedValue({} as never);

      const result = await service.removeComment(
        'ticket-1',
        'comment-1',
        qseActor,
      );

      expect(result).toEqual({ success: true });
      expect(prisma.ticketComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
          data: expect.objectContaining({ deleted_by: qseActor.id }),
        }),
      );
    });
  });

  describe('addAttachment()', () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 42,
    } as Express.Multer.File;

    it('throws NotFound when the ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.addAttachment('missing', file, undefined, qseActor.id),
      ).rejects.toThrow('Ticket introuvable.');
    });

    it('throws BadRequest when the target comment does not belong to this ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 'ticket-1' } as never);
      prisma.ticketComment.findUnique.mockResolvedValue({
        id: 'comment-1',
        ticket_id: 'another-ticket',
      } as never);

      await expect(
        service.addAttachment('ticket-1', file, 'comment-1', qseActor.id),
      ).rejects.toThrow(
        'Le commentaire sélectionné est introuvable pour ce ticket.',
      );
    });

    it('saves the file to storage and creates the attachment record', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 'ticket-1' } as never);
      storage.save.mockResolvedValue('https://storage/photo.png');
      prisma.ticketAttachment.create.mockResolvedValue({
        id: 'attachment-1',
      } as never);

      const result = await service.addAttachment(
        'ticket-1',
        file,
        undefined,
        qseActor.id,
      );

      expect(storage.save).toHaveBeenCalledWith(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
      expect(result).toEqual({ id: 'attachment-1' });
    });
  });

  describe('removeAttachment()', () => {
    function existingAttachment(overrides: Record<string, unknown> = {}) {
      return {
        id: 'attachment-1',
        ticket_id: 'ticket-1',
        file_url: 'https://storage/photo.png',
        uploaded_by: qseActor.id,
        ...overrides,
      };
    }

    it('throws NotFound when the attachment does not exist or belongs to another ticket', async () => {
      prisma.ticketAttachment.findUnique.mockResolvedValue(
        existingAttachment({ ticket_id: 'another-ticket' }) as never,
      );

      await expect(
        service.removeAttachment('ticket-1', 'attachment-1', qseActor),
      ).rejects.toThrow('Pièce jointe introuvable.');
    });

    it('throws Forbidden when the role cannot delete this attachment', async () => {
      prisma.ticketAttachment.findUnique.mockResolvedValue(
        existingAttachment() as never,
      );
      permissions.canDeleteAttachment.mockReturnValue(false);

      await expect(
        service.removeAttachment('ticket-1', 'attachment-1', qseActor),
      ).rejects.toThrow('Votre rôle ne permet pas de supprimer cette pièce jointe.');
    });

    it('deletes the attachment record and removes the file from storage', async () => {
      prisma.ticketAttachment.findUnique.mockResolvedValue(
        existingAttachment() as never,
      );
      permissions.canDeleteAttachment.mockReturnValue(true);

      const result = await service.removeAttachment(
        'ticket-1',
        'attachment-1',
        qseActor,
      );

      expect(result).toEqual({ success: true });
      expect(prisma.ticketAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      });
      expect(storage.remove).toHaveBeenCalledWith(
        'https://storage/photo.png',
      );
    });
  });

  describe('removeTag()', () => {
    beforeEach(() => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
    });

    it('throws NotFound when the tag does not exist on this ticket', async () => {
      prisma.ticketTag.findUnique.mockResolvedValue(null);

      await expect(
        service.removeTag('ticket-1', 'tag-1', qseActor),
      ).rejects.toThrow('Tag introuvable.');
    });

    it('removes the tag when it belongs to the ticket', async () => {
      prisma.ticketTag.findUnique.mockResolvedValue({
        id: 'tag-1',
        ticket_id: 'ticket-1',
      } as never);

      const result = await service.removeTag('ticket-1', 'tag-1', qseActor);

      expect(result).toEqual({ success: true });
      expect(prisma.ticketTag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
    });
  });

  describe('updateSubtask() / removeSubtask()', () => {
    beforeEach(() => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
    });

    it('throws NotFound when updating a subtask that does not belong to the ticket', async () => {
      prisma.ticketSubtask.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubtask(
          'ticket-1',
          'subtask-1',
          { done: true },
          qseActor,
        ),
      ).rejects.toThrow('Sous-tâche introuvable.');
    });

    it('updates the subtask label and done flag', async () => {
      prisma.ticketSubtask.findUnique.mockResolvedValue({
        id: 'subtask-1',
        ticket_id: 'ticket-1',
      } as never);
      prisma.ticketSubtask.update.mockResolvedValue({
        id: 'subtask-1',
        label: 'Vérifier EPI',
        done: true,
      } as never);

      const result = await service.updateSubtask(
        'ticket-1',
        'subtask-1',
        { done: true },
        qseActor,
      );

      expect(result).toEqual({
        id: 'subtask-1',
        label: 'Vérifier EPI',
        done: true,
      });
    });

    it('throws NotFound when removing a subtask that does not belong to the ticket', async () => {
      prisma.ticketSubtask.findUnique.mockResolvedValue(null);

      await expect(
        service.removeSubtask('ticket-1', 'subtask-1', qseActor),
      ).rejects.toThrow('Sous-tâche introuvable.');
    });

    it('removes the subtask when it belongs to the ticket', async () => {
      prisma.ticketSubtask.findUnique.mockResolvedValue({
        id: 'subtask-1',
        ticket_id: 'ticket-1',
      } as never);

      const result = await service.removeSubtask(
        'ticket-1',
        'subtask-1',
        qseActor,
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('removeLink()', () => {
    beforeEach(() => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
    });

    it('throws NotFound when no link exists between the two tickets', async () => {
      prisma.ticketLink.findFirst.mockResolvedValue(null);

      await expect(
        service.removeLink('ticket-1', 'ticket-2', qseActor),
      ).rejects.toThrow('Lien introuvable.');
    });

    it('removes the link regardless of which side it was stored on', async () => {
      prisma.ticketLink.findFirst.mockResolvedValue({ id: 'link-1' } as never);

      const result = await service.removeLink(
        'ticket-1',
        'ticket-2',
        qseActor,
      );

      expect(result).toEqual({ success: true });
      expect(prisma.ticketLink.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
    });
  });

  describe('setCustomField() / removeCustomField()', () => {
    beforeEach(() => {
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
    });

    it('merges the new key into the existing custom_fields map', async () => {
      prisma.ticket.findUnique
        .mockResolvedValueOnce(buildTicketRecord(QSE_CHANTIER) as never)
        .mockResolvedValueOnce({
          custom_fields: { existing: 'value' },
        } as never);
      prisma.ticket.update.mockResolvedValue({
        custom_fields: { existing: 'value', zone: 'A' },
      } as never);

      const result = await service.setCustomField(
        'ticket-1',
        { key: 'zone', value: 'A' },
        qseActor,
      );

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { custom_fields: { existing: 'value', zone: 'A' } },
        }),
      );
      expect(result).toEqual({ existing: 'value', zone: 'A' });
    });

    it('throws NotFound if the ticket disappears between the modify check and the field read', async () => {
      prisma.ticket.findUnique
        .mockResolvedValueOnce(buildTicketRecord(QSE_CHANTIER) as never)
        .mockResolvedValueOnce(null);

      await expect(
        service.setCustomField('ticket-1', { key: 'zone', value: 'A' }, qseActor),
      ).rejects.toThrow('Ticket introuvable.');
    });

    it('removes only the targeted key from the custom_fields map', async () => {
      prisma.ticket.findUnique
        .mockResolvedValueOnce(buildTicketRecord(QSE_CHANTIER) as never)
        .mockResolvedValueOnce({
          custom_fields: { zone: 'A', trade: 'plomberie' },
        } as never);
      prisma.ticket.update.mockResolvedValue({
        custom_fields: { trade: 'plomberie' },
      } as never);

      const result = await service.removeCustomField(
        'ticket-1',
        'zone',
        qseActor,
      );

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { custom_fields: { trade: 'plomberie' } },
        }),
      );
      expect(result).toEqual({ trade: 'plomberie' });
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      prisma.ticket.findMany.mockResolvedValue([]);
    });

    it('checks chantier visibility when an explicit projectId filter is given', async () => {
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(
        service.search({ projectId: OTHER_CHANTIER }, qseActor),
      ).rejects.toThrow(ForbiddenException);

      expect(access.assertCanView).toHaveBeenCalledWith(OTHER_CHANTIER, qseActor);
      expect(prisma.ticket.findMany).not.toHaveBeenCalled();
    });

    it('clamps the requested limit to 50', async () => {
      access.visibleProjectIdsFilter.mockResolvedValue(undefined);

      await service.search({ limit: 500 }, adminActor);

      const call = prisma.ticket.findMany.mock.calls[0][0] as { take: number };
      expect(call.take).toBe(50);
    });
  });

  describe('update() notification side-effects', () => {
    it('notifies the new assignee when assignment changes on an already-authorized update', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER, { assigned_to: null }) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canAssignTicket.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: 'assignee-2' } as never);
      prisma.ticket.update.mockResolvedValue({
        id: 'ticket-1',
        assigned_to_user: { id: 'assignee-2' },
      } as never);

      await service.update(
        'ticket-1',
        { assignedTo: 'assignee-2' },
        qseActor,
      );

      expect(notifications.notifyTicketAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        'assignee-2',
        qseActor.id,
      );
    });

    it('logs status history and notifies stakeholders when the status changes', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER, { status_id: 'status-old' }) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
      prisma.ticketStatus.findUnique.mockResolvedValue({
        id: 'status-new',
      } as never);
      prisma.projectMember.findMany.mockResolvedValue([]);
      prisma.ticket.update.mockResolvedValue({
        id: 'ticket-1',
        status: { name: 'Résolu' },
        assigned_to_user: null,
      } as never);

      await service.update('ticket-1', { statusId: 'status-new' }, qseActor);

      expect(prisma.ticketStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            from_status_id: 'status-old',
            to_status_id: 'status-new',
          }),
        }),
      );
      expect(notifications.notifyStatusChanged).toHaveBeenCalled();
    });
  });

  describe('remove() attachment cleanup', () => {
    it('removes every attachment file from storage after deleting the ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canDeleteTicket.mockResolvedValue(true);
      prisma.ticketAttachment.findMany.mockResolvedValue([
        { file_url: 'https://storage/a.png' },
        { file_url: 'https://storage/b.png' },
      ] as never);
      prisma.ticket.delete.mockResolvedValue({} as never);

      await service.remove('ticket-1', qseActor);

      expect(storage.remove).toHaveBeenCalledWith('https://storage/a.png');
      expect(storage.remove).toHaveBeenCalledWith('https://storage/b.png');
      expect(storage.remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureCanModify() permission-denied branch', () => {
    it('throws Forbidden when the actor belongs to the chantier but the scope check refuses', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER, { ticket_type: { code: 'DELAY' } }) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(false);

      await expect(
        service.addSubtask('ticket-1', { label: 'x' }, qseActor),
      ).rejects.toThrow('Votre rôle ne permet pas de modifier ce ticket.');
      expect(prisma.ticketSubtask.create).not.toHaveBeenCalled();
    });
  });

  describe('addTag() conflict handling', () => {
    it('maps a duplicate-label unique constraint violation to a 400', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
      prisma.ticketTag.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.addTag('ticket-1', { label: 'urgent' }, qseActor),
      ).rejects.toThrow('Ce tag existe déjà sur ce ticket.');
    });
  });

  describe('addLink() validation and success path', () => {
    beforeEach(() => {
      prisma.ticket.findUnique.mockResolvedValue(
        buildTicketRecord(QSE_CHANTIER) as never,
      );
      access.assertCanView.mockResolvedValue(undefined);
      permissions.canModifyTicket.mockResolvedValue(true);
    });

    it('throws BadRequest when linking a ticket to itself', async () => {
      await expect(
        service.addLink(
          'ticket-1',
          { linkedTicketId: 'ticket-1' },
          qseActor,
        ),
      ).rejects.toThrow('Un ticket ne peut pas être lié à lui-même.');
    });

    it('throws BadRequest when the two tickets are already linked', async () => {
      prisma.ticketLink.findFirst.mockResolvedValue({ id: 'link-1' } as never);

      await expect(
        service.addLink(
          'ticket-1',
          { linkedTicketId: 'ticket-2' },
          qseActor,
        ),
      ).rejects.toThrow('Ces tickets sont déjà liés.');
    });

    it('creates the link and returns the linked ticket summary', async () => {
      prisma.ticketLink.findFirst.mockResolvedValue(null);
      prisma.ticketLink.create.mockResolvedValue({
        linked_ticket: { id: 'ticket-2', ticket_number: 'TKT-2026-0002' },
      } as never);

      const result = await service.addLink(
        'ticket-1',
        { linkedTicketId: 'ticket-2' },
        qseActor,
      );

      expect(result).toEqual({ id: 'ticket-2', ticket_number: 'TKT-2026-0002' });
    });
  });
});
