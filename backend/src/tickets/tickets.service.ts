import { basename, join } from 'path';
import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { sanitizeCommentHtml } from '../common/sanitize-comment-html';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from '../common/uploads.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  TicketAuthorizationContext,
  TicketsPermissionsService,
} from './tickets-permissions.service';

export interface TicketActor {
  id: string;
  role: RoleCode;
}

const MODIFIABLE_TICKET_FIELDS: Array<keyof UpdateTicketDto> = [
  'title',
  'description',
  'priority',
  'isBlocking',
  'locationZone',
  'trade',
  'externalParty',
  'dueDate',
  'statusId',
];

const attachmentSelect = {
  id: true,
  comment_id: true,
  file_url: true,
  file_name: true,
  file_type: true,
  file_size: true,
  uploaded_at: true,
  uploader: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  },
} as const;

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
      role: {
        select: { code: true, name: true },
      },
    },
  },
  assigned_to_user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: {
        select: { code: true, name: true },
      },
    },
  },
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: TicketsPermissionsService,
  ) {}

  findAll(actor: TicketActor) {
    const canViewInternalComments = this.permissions.canViewInternalComments(
      actor.role,
    );

    return this.prisma.ticket.findMany({
      orderBy: [{ created_at: 'desc' }],
      select: {
        ...ticketSelect,
        // Only the latest visible comment is needed here, to power the
        // "last activity" preview/sort in the ticket list — the full
        // conversation is fetched separately by findOne when a ticket is
        // opened.
        comments: {
          where: canViewInternalComments ? undefined : { is_internal: false },
          orderBy: [{ created_at: 'desc' }],
          take: 1,
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
      },
    });
  }

  async findOne(id: string, actor: TicketActor) {
    const canViewInternalComments = this.permissions.canViewInternalComments(
      actor.role,
    );

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        ...ticketSelect,
        comments: {
          where: canViewInternalComments ? undefined : { is_internal: false },
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
            attachments: {
              orderBy: [{ uploaded_at: 'asc' }],
              select: attachmentSelect,
            },
          },
        },
        attachments: {
          orderBy: [{ uploaded_at: 'asc' }],
          select: attachmentSelect,
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
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
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

  async create(createTicketDto: CreateTicketDto, actor: TicketActor) {
    if (!this.permissions.canCreateTicket(actor.role)) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de créer un ticket.',
      );
    }

    const userId = actor.id;
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
      throw new BadRequestException("Le statut initial n'est pas disponible.");
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
        due_date: createTicketDto.dueDate
          ? new Date(createTicketDto.dueDate)
          : undefined,
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

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    actor: TicketActor,
  ) {
    const userId = actor.id;
    const ticket = await this.getAuthorizationContext(id);

    const isAssigning = updateTicketDto.assignedTo !== undefined;
    const isModifyingOtherFields = MODIFIABLE_TICKET_FIELDS.some(
      (field) => updateTicketDto[field] !== undefined,
    );

    if (
      isAssigning &&
      !(await this.permissions.canAssignTicket(actor.role, actor.id, ticket))
    ) {
      throw new ForbiddenException(
        "Votre rôle ne permet pas d'assigner ce ticket.",
      );
    }

    if (
      isModifyingOtherFields &&
      !(await this.permissions.canModifyTicket(actor.role, actor.id, ticket))
    ) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de modifier ce ticket.',
      );
    }

    if (updateTicketDto.statusId) {
      await this.ensureStatusExists(updateTicketDto.statusId);
    }

    if (updateTicketDto.assignedTo) {
      await this.ensureUserExists(updateTicketDto.assignedTo);
    }

    const updateData: Record<string, unknown> = {
      title: updateTicketDto.title,
      description: updateTicketDto.description,
      priority: updateTicketDto.priority,
      is_blocking: updateTicketDto.isBlocking,
      location_zone: updateTicketDto.locationZone,
      trade: updateTicketDto.trade,
      external_party: updateTicketDto.externalParty,
      due_date: updateTicketDto.dueDate
        ? new Date(updateTicketDto.dueDate)
        : undefined,
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

    if (
      updateTicketDto.statusId &&
      updateTicketDto.statusId !== ticket.status_id
    ) {
      await this.prisma.ticketStatusHistory.create({
        data: {
          ticket_id: id,
          from_status_id: ticket.status_id,
          to_status_id: updateTicketDto.statusId,
          changed_by: userId,
          comment: 'Statut mis à jour',
        },
      });
    }

    return updatedTicket;
  }

  async remove(id: string, actor: TicketActor) {
    const ticket = await this.getAuthorizationContext(id);

    if (
      !(await this.permissions.canDeleteTicket(actor.role, actor.id, ticket))
    ) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de supprimer ce ticket.',
      );
    }

    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { ticket_id: id },
      select: { file_url: true },
    });

    await this.prisma.ticket.delete({ where: { id } });

    await Promise.all(
      attachments.map(async (attachment) => {
        try {
          await unlink(join(UPLOADS_DIR, basename(attachment.file_url)));
        } catch {
          // best-effort cleanup: file may already be missing on disk
        }
      }),
    );

    return { success: true };
  }

  async addComment(
    ticketId: string,
    createCommentDto: CreateCommentDto,
    actor: TicketActor,
  ) {
    await this.ensureTicketExists(ticketId);

    if (!this.permissions.canCommentOnTicket(actor.role)) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de commenter ce ticket.',
      );
    }

    // External roles can never post internal/private comments, regardless of
    // what the client sends — the server is the source of truth here.
    const isInternal = this.permissions.canViewInternalComments(actor.role)
      ? (createCommentDto.isInternal ?? true)
      : false;

    return this.prisma.ticketComment.create({
      data: {
        ticket_id: ticketId,
        user_id: actor.id,
        comment_text: sanitizeCommentHtml(createCommentDto.commentText),
        is_internal: isInternal,
      },
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
    });
  }

  async addAttachment(
    ticketId: string,
    file: Express.Multer.File,
    commentId: string | undefined,
    userId: string,
  ) {
    await this.ensureTicketExists(ticketId);

    if (commentId) {
      const comment = await this.prisma.ticketComment.findUnique({
        where: { id: commentId },
        select: { id: true, ticket_id: true },
      });

      if (!comment || comment.ticket_id !== ticketId) {
        throw new BadRequestException(
          'Le commentaire sélectionné est introuvable pour ce ticket.',
        );
      }
    }

    return this.prisma.ticketAttachment.create({
      data: {
        ticket_id: ticketId,
        comment_id: commentId ?? null,
        file_url: `${UPLOADS_URL_PREFIX}/${file.filename}`,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by: userId,
      },
      select: attachmentSelect,
    });
  }

  async removeAttachment(
    ticketId: string,
    attachmentId: string,
    actor: TicketActor,
  ) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, ticket_id: true, file_url: true, uploaded_by: true },
    });

    if (!attachment || attachment.ticket_id !== ticketId) {
      throw new NotFoundException('Pièce jointe introuvable.');
    }

    if (
      !this.permissions.canDeleteAttachment(actor.role, actor.id, attachment)
    ) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de supprimer cette pièce jointe.',
      );
    }

    await this.prisma.ticketAttachment.delete({ where: { id: attachmentId } });

    try {
      await unlink(join(UPLOADS_DIR, basename(attachment.file_url)));
    } catch {
      // best-effort cleanup: file may already be missing on disk
    }

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
      throw new BadRequestException(
        "L'utilisateur sélectionné est introuvable.",
      );
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

  private async getAuthorizationContext(
    id: string,
  ): Promise<TicketAuthorizationContext> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        project_id: true,
        created_by: true,
        assigned_to: true,
        status_id: true,
        ticket_type: { select: { code: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    return ticket;
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
