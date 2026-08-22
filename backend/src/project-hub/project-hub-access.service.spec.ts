import { ForbiddenException } from '@nestjs/common';
import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectHubAccessService, ProjectHubActor } from './project-hub-access.service';

describe('ProjectHubAccessService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: ProjectHubAccessService;

  const projectId = 'chantier-1';
  const userId = 'user-1';

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new ProjectHubAccessService(prisma as unknown as PrismaService);
  });

  describe('assertCanView() — broad-view roles', () => {
    it.each([
      RoleCode.admin,
      RoleCode.moa,
      RoleCode.moe,
      RoleCode.conducteur_travaux,
    ])('is a no-op for %s and never queries membership', async (role) => {
      const actor: ProjectHubActor = { id: userId, role };

      await expect(service.assertCanView(projectId, actor)).resolves.toBeUndefined();

      expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('assertCanView() — chantier-scoped roles', () => {
    it.each([
      RoleCode.chef_chantier,
      RoleCode.sous_traitant,
      RoleCode.qse,
      RoleCode.observateur,
    ])('rejects %s with 403 when they are not a member of the chantier', async (role) => {
      prisma.projectMember.findUnique.mockResolvedValue(null);
      const actor: ProjectHubActor = { id: userId, role };

      await expect(service.assertCanView(projectId, actor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each([
      RoleCode.chef_chantier,
      RoleCode.sous_traitant,
      RoleCode.qse,
      RoleCode.observateur,
    ])('allows %s when they are a member of the chantier', async (role) => {
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'm-1' } as never);
      const actor: ProjectHubActor = { id: userId, role };

      await expect(service.assertCanView(projectId, actor)).resolves.toBeUndefined();

      expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: { project_id_user_id: { project_id: projectId, user_id: userId } },
        select: { id: true },
      });
    });
  });
});
