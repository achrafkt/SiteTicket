import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketAuthorizationContext,
  TicketsPermissionsService,
} from './tickets-permissions.service';

function ticketIn(
  projectId: string,
  overrides: Partial<TicketAuthorizationContext> = {},
): TicketAuthorizationContext {
  return {
    project_id: projectId,
    created_by: 'someone-else',
    assigned_to: null,
    status_id: 'status-1',
    ticket_type: { code: 'DELAY' },
    ...overrides,
  };
}

describe('TicketsPermissionsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: TicketsPermissionsService;

  const userId = 'user-1';
  const projectId = 'project-1';

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new TicketsPermissionsService(prisma as unknown as PrismaService);
  });

  // project_member scope: moe (modify/assign) and chef_chantier (modify/assign)
  describe('scope: project_member', () => {
    it('moe can modify a ticket in a chantier they are a member of', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'm-1' } as never);

      const allowed = await service.canModifyTicket(
        RoleCode.moe,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(true);
      expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: { project_id_user_id: { project_id: projectId, user_id: userId } },
        select: { id: true },
      });
    });

    it('moe cannot modify a ticket in a chantier they are not a member of', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      const allowed = await service.canModifyTicket(
        RoleCode.moe,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(false);
    });

    it('chef_chantier can assign a ticket in a chantier they belong to', async () => {
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'm-1' } as never);

      const allowed = await service.canAssignTicket(
        RoleCode.chef_chantier,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(true);
    });

    it('chef_chantier cannot assign a ticket outside every chantier they belong to', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      const allowed = await service.canAssignTicket(
        RoleCode.chef_chantier,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(false);
    });
  });

  // own_ticket scope: moa (modify), qse (delete), observateur (delete)
  //
  // IMPORTANT: this scope, by itself, only checks ticket ownership — it never
  // looks at chantier membership, even when the ticket in question belongs to
  // a chantier the user has nothing to do with. That's intentional, not a
  // bug: TicketsService.update()/remove()/ensureCanModify() always call
  // ProjectHubAccessService.assertCanView() *before* reaching this scope
  // check (see tickets.service.spec.ts), so chantier membership is enforced
  // one layer up. Do not "fix" this test by adding a chantier check here.
  describe('scope: own_ticket', () => {
    it('moa can modify their own ticket', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.moa,
        userId,
        ticketIn(projectId, { created_by: userId }),
      );

      expect(allowed).toBe(true);
    });

    it('moa cannot modify a ticket created by someone else', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.moa,
        userId,
        ticketIn(projectId, { created_by: 'another-user' }),
      );

      expect(allowed).toBe(false);
    });

    it('own_ticket scope alone says yes for a ticket owned by the user even in an unrelated chantier (chantier check happens upstream, not here)', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.moa,
        userId,
        ticketIn('some-other-chantier', { created_by: userId }),
      );

      expect(allowed).toBe(true);
      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('qse can delete their own ticket regardless of ticket type', async () => {
      const allowed = await service.canDeleteTicket(
        RoleCode.qse,
        userId,
        ticketIn(projectId, { created_by: userId, ticket_type: { code: 'DELAY' } }),
      );

      expect(allowed).toBe(true);
    });

    it('observateur cannot delete a ticket they did not create', async () => {
      const allowed = await service.canDeleteTicket(
        RoleCode.observateur,
        userId,
        ticketIn(projectId, { created_by: 'another-user' }),
      );

      expect(allowed).toBe(false);
    });
  });

  // assigned_ticket scope: sous_traitant (modify)
  describe('scope: assigned_ticket', () => {
    it('sous_traitant can modify a ticket assigned to them', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.sous_traitant,
        userId,
        ticketIn(projectId, { assigned_to: userId }),
      );

      expect(allowed).toBe(true);
    });

    it('sous_traitant cannot modify a ticket assigned to someone else', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.sous_traitant,
        userId,
        ticketIn(projectId, { assigned_to: 'another-user' }),
      );

      expect(allowed).toBe(false);
    });

    it('sous_traitant cannot modify an unassigned ticket', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.sous_traitant,
        userId,
        ticketIn(projectId, { assigned_to: null }),
      );

      expect(allowed).toBe(false);
    });
  });

  // ticket_type_safety scope: qse (modify)
  describe('scope: ticket_type_safety', () => {
    it('qse can modify a SAFETY ticket', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.qse,
        userId,
        ticketIn(projectId, { ticket_type: { code: 'SAFETY' } }),
      );

      expect(allowed).toBe(true);
    });

    it('qse cannot modify a non-SAFETY ticket', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.qse,
        userId,
        ticketIn(projectId, { ticket_type: { code: 'DELAY' } }),
      );

      expect(allowed).toBe(false);
    });

    it('ticket_type_safety scope alone does not check chantier membership either (upstream concern, same as own_ticket)', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.qse,
        userId,
        ticketIn('some-other-chantier', { ticket_type: { code: 'SAFETY' } }),
      );

      expect(allowed).toBe(true);
      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    });
  });

  // Broad-view roles: admin, moa, moe, conducteur_travaux
  describe('broad-view roles', () => {
    it('admin can modify any ticket regardless of chantier or ownership ("all" scope)', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.admin,
        userId,
        ticketIn('unrelated-chantier', { created_by: 'someone-else' }),
      );

      expect(allowed).toBe(true);
      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('admin can delete any ticket ("all" scope)', async () => {
      const allowed = await service.canDeleteTicket(
        RoleCode.admin,
        userId,
        ticketIn('unrelated-chantier', { created_by: 'someone-else' }),
      );

      expect(allowed).toBe(true);
    });

    it('conducteur_travaux can modify and assign any ticket ("all" scope)', async () => {
      const ticket = ticketIn('unrelated-chantier', { created_by: 'someone-else' });

      expect(
        await service.canModifyTicket(RoleCode.conducteur_travaux, userId, ticket),
      ).toBe(true);
      expect(
        await service.canAssignTicket(RoleCode.conducteur_travaux, userId, ticket),
      ).toBe(true);
    });

    it('moa can never assign a ticket ("none" scope, no Prisma call)', async () => {
      const allowed = await service.canAssignTicket(
        RoleCode.moa,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(false);
      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('moe is scoped to project_member for modify, not "all" (regression: moe is broad-view for chantier visibility but not for ticket scope)', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      const allowed = await service.canModifyTicket(
        RoleCode.moe,
        userId,
        ticketIn('unrelated-chantier', { created_by: 'someone-else' }),
      );

      expect(allowed).toBe(false);
    });
  });

  describe('none scope', () => {
    it('sous_traitant can never assign a ticket', async () => {
      const allowed = await service.canAssignTicket(
        RoleCode.sous_traitant,
        userId,
        ticketIn(projectId),
      );

      expect(allowed).toBe(false);
    });

    it('observateur can never modify a ticket', async () => {
      const allowed = await service.canModifyTicket(
        RoleCode.observateur,
        userId,
        ticketIn(projectId, { created_by: userId }),
      );

      expect(allowed).toBe(false);
    });
  });
});
