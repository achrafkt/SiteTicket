import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const ticketSelect = {
  id: true,
  ticket_number: true,
  title: true,
  description: true,
  priority: true,
  is_blocking: true,
  location_zone: true,
  trade: true,
  external_party: true,
  due_date: true,
  resolved_at: true,
  closed_at: true,
  created_at: true,
  updated_at: true,
  project: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  ticket_type: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  status: {
    select: {
      id: true,
      code: true,
      name: true,
      sort_order: true,
      is_terminal: true,
    },
  },
  created_by_user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  },
  assigned_to_user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.ticket.findMany({
      orderBy: [{ created_at: 'desc' }],
      select: ticketSelect,
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        ...ticketSelect,
        comments: {
          orderBy: [{ created_at: 'asc' }],
          select: {
            id: true,
            comment_text: true,
            is_internal: true,
            created_at: true,
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        status_history: {
          orderBy: [{ changed_at: 'asc' }],
          select: {
            id: true,
            comment: true,
            changed_at: true,
            from_status: {
              select: { id: true, code: true, name: true },
            },
            to_status: {
              select: { id: true, code: true, name: true },
            },
            changed_by_user: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    return ticket;
  }

  async create(createTicketDto: CreateTicketDto, userId: string) {
    await this.ensureProjectExists(createTicketDto.projectId);
    await this.ensureTicketTypeExists(createTicketDto.ticketTypeId);
    await this.ensureUserExists(userId);

    if (createTicketDto.assignedTo) {
      await this.ensureUserExists(createTicketDto.assignedTo);
    }

    const initialStatus = await this.prisma.ticketStatus.findFirst({
      where: { code: 'NEW' },
      select: { id: true },
    });

    if (!initialStatus) {
      throw new BadRequestException('Le statut initial n\'est pas disponible.');
    }

    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.ticket.create({
      data: {
        ticket_number: ticketNumber,
        project_id: createTicketDto.projectId,
        ticket_type_id: createTicketDto.ticketTypeId,
        status_id: initialStatus.id,
        title: createTicketDto.title,
        description: createTicketDto.description,
        priority: createTicketDto.priority ?? 'medium',
        is_blocking: createTicketDto.isBlocking ?? false,
        location_zone: createTicketDto.locationZone,
        trade: createTicketDto.trade,
        external_party: createTicketDto.externalParty,
        due_date: createTicketDto.dueDate ? new Date(createTicketDto.dueDate) : undefined,
        created_by: userId,
        assigned_to: createTicketDto.assignedTo,
      },
      select: ticketSelect,
    });

    await this.prisma.ticketStatusHistory.create({
      data: {
        ticket_id: ticket.id,
        to_status_id: initialStatus.id,
        changed_by: userId,
        comment: 'Ticket créé',
      },
    });

    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, userId: string) {
    await this.ensureTicketExists(id);

    if (updateTicketDto.statusId) {
      await this.ensureStatusExists(updateTicketDto.statusId);
    }

    if (updateTicketDto.assignedTo) {
      await this.ensureUserExists(updateTicketDto.assignedTo);
    }

    const currentTicket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { status_id: true },
    });

    if (!currentTicket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    const updateData: Record<string, unknown> = {
      title: updateTicketDto.title,
      description: updateTicketDto.description,
      priority: updateTicketDto.priority,
      is_blocking: updateTicketDto.isBlocking,
      location_zone: updateTicketDto.locationZone,
      trade: updateTicketDto.trade,
      external_party: updateTicketDto.externalParty,
      due_date: updateTicketDto.dueDate ? new Date(updateTicketDto.dueDate) : undefined,
      assigned_to: updateTicketDto.assignedTo,
      status_id: updateTicketDto.statusId,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      select: ticketSelect,
    });

    if (updateTicketDto.statusId && updateTicketDto.statusId !== currentTicket.status_id) {
      await this.prisma.ticketStatusHistory.create({
        data: {
          ticket_id: id,
          from_status_id: currentTicket.status_id,
          to_status_id: updateTicketDto.statusId,
          changed_by: userId,
          comment: 'Statut mis à jour',
        },
      });
    }

    return updatedTicket;
  }

  async remove(id: string) {
    await this.ensureTicketExists(id);
    await this.prisma.ticket.delete({ where: { id } });
    return { success: true };
  }

  private async generateTicketNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const count = await this.prisma.ticket.count();
    return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException('Le projet sélectionné est introuvable.');
    }
  }

  private async ensureTicketTypeExists(ticketTypeId: string) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      select: { id: true },
    });

    if (!ticketType) {
      throw new BadRequestException('Le type de ticket est introuvable.');
    }
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('L\'utilisateur sélectionné est introuvable.');
    }
  }

  private async ensureTicketExists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }
  }

  private async ensureStatusExists(statusId: string) {
    const status = await this.prisma.ticketStatus.findUnique({
      where: { id: statusId },
      select: { id: true },
    });

    if (!status) {
      throw new BadRequestException('Le statut sélectionné est introuvable.');
    }
  }
}
