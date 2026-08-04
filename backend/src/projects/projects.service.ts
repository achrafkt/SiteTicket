import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      orderBy: [{ created_at: 'desc' }],
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
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
    });
  }

  async remove(id: string) {
    await this.ensureProjectExists(id);
    await this.prisma.project.delete({ where: { id } });

    return { success: true };
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