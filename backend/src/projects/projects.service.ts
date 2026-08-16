import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectActivityAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectMemberSelect = {
  id: true,
  role_on_project: true,
  added_at: true,
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar_url: true,
      role: { select: { code: true, name: true } },
    },
  },
} as const;

const memberUserNameSelect = {
  id: true,
  first_name: true,
  last_name: true,
  role: { select: { code: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      orderBy: [{ created_at: 'desc' }],
      include: { _count: { select: { members: true } } },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return project;
  }

  async create(createProjectDto: CreateProjectDto) {
    const existingProject = await this.prisma.project.findUnique({
      where: { code: createProjectDto.code },
      select: { id: true },
    });

    if (existingProject) {
      throw new BadRequestException('Ce code projet est déjà utilisé.');
    }

    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        code: createProjectDto.code,
        address: createProjectDto.address,
        client_name: createProjectDto.clientName,
        status: createProjectDto.status,
        start_date: this.toDate(createProjectDto.startDate),
        end_date_planned: this.toDate(createProjectDto.endDatePlanned),
        end_date_actual: this.toDate(createProjectDto.endDateActual),
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.ensureProjectExists(id);

    if (updateProjectDto.code) {
      const existingProject = await this.prisma.project.findFirst({
        where: {
          code: updateProjectDto.code,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingProject) {
        throw new BadRequestException('Ce code projet est déjà utilisé.');
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: updateProjectDto.name,
        code: updateProjectDto.code,
        address: updateProjectDto.address,
        client_name: updateProjectDto.clientName,
        status: updateProjectDto.status,
        start_date: this.toDate(updateProjectDto.startDate),
        end_date_planned: this.toDate(updateProjectDto.endDatePlanned),
        end_date_actual: this.toDate(updateProjectDto.endDateActual),
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async remove(id: string) {
    await this.ensureProjectExists(id);
    await this.prisma.project.delete({ where: { id } });

    return { success: true };
  }

  async findMembers(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.projectMember.findMany({
      where: { project_id: projectId },
      select: projectMemberSelect,
      orderBy: { added_at: 'asc' },
    });
  }

  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    actorId: string,
  ) {
    await this.ensureProjectExists(projectId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: memberUserNameSelect,
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    const existingMembership = await this.prisma.projectMember.findUnique({
      where: {
        project_id_user_id: { project_id: projectId, user_id: dto.userId },
      },
      select: { role_on_project: true },
    });

    const newRole = dto.roleOnProject ?? user.role.code;
    const userName = `${user.first_name} ${user.last_name}`;

    const member = await this.prisma.projectMember.upsert({
      where: {
        project_id_user_id: { project_id: projectId, user_id: dto.userId },
      },
      update: { role_on_project: newRole },
      create: {
        project_id: projectId,
        user_id: dto.userId,
        role_on_project: newRole,
      },
      select: projectMemberSelect,
    });

    if (!existingMembership) {
      await this.logActivity(
        projectId,
        actorId,
        'member_added',
        `Membre ajouté : ${userName} (${newRole})`,
      );
    } else if (existingMembership.role_on_project !== newRole) {
      await this.logActivity(
        projectId,
        actorId,
        'member_role_updated',
        `Rôle modifié pour ${userName} : ${existingMembership.role_on_project ?? '—'} → ${newRole}`,
      );
    }

    return member;
  }

  async removeMember(projectId: string, userId: string, actorId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      select: {
        id: true,
        user: { select: { first_name: true, last_name: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Ce membre ne fait pas partie du chantier.');
    }

    await this.prisma.projectMember.delete({ where: { id: membership.id } });

    await this.logActivity(
      projectId,
      actorId,
      'member_removed',
      `Membre retiré : ${membership.user.first_name} ${membership.user.last_name}`,
    );

    return { success: true };
  }

  private async logActivity(
    projectId: string,
    actorId: string,
    action: ProjectActivityAction,
    summary: string,
  ) {
    await this.prisma.projectActivityLogEntry.create({
      data: { project_id: projectId, actor_id: actorId, action, summary },
    });
  }

  private async ensureProjectExists(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }
}
