import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  canManageProjectBudget,
  canManageProjectField,
  canManageProjectInfo,
  canViewProjectBudget,
  hasBroadProjectView,
} from '../common/permissions/project-hub-permissions';

export interface ProjectHubActor {
  id: string;
  role: RoleCode;
}

// Every manager role set (info/budget) is a subset of the broad-view roles,
// so only the field-manager set (which also includes chef_chantier) can ever
// need the extra membership check below.
@Injectable()
export class ProjectHubAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanView(projectId: string, actor: ProjectHubActor): Promise<void> {
    if (hasBroadProjectView(actor.role)) return;
    const isMember = await this.isProjectMember(projectId, actor.id);
    if (!isMember) {
      throw new ForbiddenException('Vous n’avez pas accès à ce chantier.');
    }
  }

  assertCanManageInfo(actor: ProjectHubActor): void {
    if (!canManageProjectInfo(actor.role)) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à modifier les informations du chantier.',
      );
    }
  }

  async assertCanManageField(
    projectId: string,
    actor: ProjectHubActor,
  ): Promise<void> {
    if (!canManageProjectField(actor.role)) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à modifier le suivi de ce chantier.',
      );
    }
    await this.assertCanView(projectId, actor);
  }

  assertCanManageBudget(actor: ProjectHubActor): void {
    if (!canManageProjectBudget(actor.role)) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à modifier le budget de ce chantier.',
      );
    }
  }

  canSeeBudget(actor: ProjectHubActor): boolean {
    return canViewProjectBudget(actor.role);
  }

  async visibleProjectIdsFilter(actor: ProjectHubActor) {
    if (hasBroadProjectView(actor.role)) {
      return undefined;
    }
    return { members: { some: { user_id: actor.id } } };
  }

  private async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      select: { id: true },
    });
    return membership !== null;
  }
}
