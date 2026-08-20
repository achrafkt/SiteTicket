import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const planSelect = {
  id: true,
  project_id: true,
  name: true,
  discipline: true,
  file_url: true,
  file_type: true,
  version: true,
  uploaded_at: true,
  uploader: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar_url: true,
    },
  },
} as const;

export interface CreatePlanInput {
  name?: string;
  discipline?: string;
  version?: string;
}

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAllForProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.plan.findMany({
      where: { project_id: projectId },
      orderBy: [{ uploaded_at: 'desc' }],
      select: planSelect,
    });
  }

  async create(
    projectId: string,
    file: Express.Multer.File,
    input: CreatePlanInput,
    userId: string,
  ) {
    await this.ensureProjectExists(projectId);

    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom du plan est requis.');
    }

    const fileUrl = await this.storage.save(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return this.prisma.plan.create({
      data: {
        project_id: projectId,
        name,
        discipline: input.discipline?.trim() || null,
        version: input.version?.trim() || null,
        file_url: fileUrl,
        file_type: file.mimetype,
        uploaded_by: userId,
      },
      select: planSelect,
    });
  }

  // Deleting a plan auto-unpins any ticket placed on it (plan_id/x/y/page
  // cleared) rather than blocking the delete — this mirrors the DB's own
  // `tickets.plan_id` FK, which is already declared ON DELETE SET NULL, and
  // matches the app's general pattern of non-blocking dependent cleanup
  // (e.g. removing a ticket's attachments) rather than a hard "can't delete
  // while referenced" gate. The unpinned count is returned so the caller can
  // surface it to the user.
  async remove(projectId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, project_id: true, file_url: true },
    });

    if (!plan || plan.project_id !== projectId) {
      throw new NotFoundException('Plan introuvable pour ce chantier.');
    }

    const [{ count: unpinnedTicketCount }] = await this.prisma.$transaction([
      this.prisma.ticket.updateMany({
        where: { plan_id: planId },
        data: { plan_id: null, plan_x: null, plan_y: null, plan_page: null },
      }),
      this.prisma.plan.delete({ where: { id: planId } }),
    ]);

    await this.storage.remove(plan.file_url);

    return { success: true, unpinnedTicketCount };
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Chantier introuvable.');
    }
  }
}
