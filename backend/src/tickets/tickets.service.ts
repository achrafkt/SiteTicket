import { basename, join } from 'path';
import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import { extractMentionedUserIds } from '../common/comment-mentions';
import { sanitizeCommentHtml } from '../common/sanitize-comment-html';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from '../common/uploads.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateLinkDto } from './dto/create-link.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SetCustomFieldDto } from './dto/set-custom-field.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  TicketAuthorizationContext,
  TicketsPermissionsService,
} from './tickets-permissions.service';

export interface TicketActor {
  id: string;
  role: RoleCode;
}

function isPlainObject(
  value: Prisma.JsonValue | null | undefined,
): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

const MODIFIABLE_TICKET_FIELDS: Array<keyof UpdateTicketDto> = [
  'title',
  'description',
  'priority',
  'isBlocking',
  'locationZone',
  'trade',
  'externalParty',
  'costImpactAmount',
  'scheduleImpactDays',
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
      avatar_url: true,
    },
  },
} as const;

const linkedTicketSummarySelect = {
  id: true,
  ticket_number: true,
  title: true,
  status: {
    select: { code: true, name: true },
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
  cost_impact_amount: true,
  schedule_impact_days: true,
  due_date: true,
  resolved_at: true,
  closed_at: true,
  custom_fields: true,
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
      avatar_url: true,
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
      avatar_url: true,
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
    private readonly notifications: NotificationsService,
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
                avatar_url: true,
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
                avatar_url: true,
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
                avatar_url: true,
              },
            },
          },
        },
        tags: {
          orderBy: [{ created_at: 'asc' }],
          select: { id: true, label: true },
        },
        subtasks: {
          orderBy: [{ created_at: 'asc' }],
          select: { id: true, label: true, done: true },
        },
        links_from: {
          select: { linked_ticket: { select: linkedTicketSummarySelect } },
        },
        links_to: {
          select: { ticket: { select: linkedTicketSummarySelect } },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    const { links_from, links_to, ...rest } = ticket;

    return {
      ...rest,
      links: [
        ...links_from.map((link) => link.linked_ticket),
        ...links_to.map((link) => link.ticket),
      ],
    };
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
        cost_impact_amount: createTicketDto.costImpactAmount,
        schedule_impact_days: createTicketDto.scheduleImpactDays,
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

    if (createTicketDto.assignedTo) {
      await this.notifications.notifyTicketAssigned(
        ticket,
        createTicketDto.assignedTo,
        userId,
      );
    }

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
      cost_impact_amount: updateTicketDto.costImpactAmount,
      schedule_impact_days: updateTicketDto.scheduleImpactDays,
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
      isAssigning &&
      updateTicketDto.assignedTo &&
      updateTicketDto.assignedTo !== ticket.assigned_to
    ) {
      await this.notifications.notifyTicketAssigned(
        updatedTicket,
        updateTicketDto.assignedTo,
        userId,
      );
    }

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

      const projectMembers = await this.prisma.projectMember.findMany({
        where: { project_id: ticket.project_id },
        select: { user_id: true },
      });

      await this.notifications.notifyStatusChanged(
        updatedTicket,
        [
          updatedTicket.assigned_to_user?.id,
          ticket.created_by,
          ...projectMembers.map((member) => member.user_id),
        ],
        updatedTicket.status.name,
        userId,
      );
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
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticket_number: true, title: true, project_id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

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

    const sanitizedCommentText = sanitizeCommentHtml(
      createCommentDto.commentText,
    );

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticket_id: ticketId,
        user_id: actor.id,
        comment_text: sanitizedCommentText,
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
            avatar_url: true,
          },
        },
      },
    });

    const mentionedUserIds = extractMentionedUserIds(sanitizedCommentText);
    for (const mentionedUserId of mentionedUserIds) {
      await this.notifications.notifyMention(ticket, mentionedUserId, actor.id);
    }

    return comment;
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

  async addTag(ticketId: string, dto: CreateTagDto, actor: TicketActor) {
    await this.ensureCanModify(ticketId, actor);

    try {
      return await this.prisma.ticketTag.create({
        data: { ticket_id: ticketId, label: dto.label.trim() },
        select: { id: true, label: true },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new BadRequestException('Ce tag existe déjà sur ce ticket.');
      }
      throw err;
    }
  }

  async removeTag(ticketId: string, tagId: string, actor: TicketActor) {
    await this.ensureCanModify(ticketId, actor);

    const tag = await this.prisma.ticketTag.findUnique({
      where: { id: tagId },
      select: { id: true, ticket_id: true },
    });

    if (!tag || tag.ticket_id !== ticketId) {
      throw new NotFoundException('Tag introuvable.');
    }

    await this.prisma.ticketTag.delete({ where: { id: tagId } });

    return { success: true };
  }

  async addSubtask(
    ticketId: string,
    dto: CreateSubtaskDto,
    actor: TicketActor,
  ) {
    await this.ensureCanModify(ticketId, actor);

    return this.prisma.ticketSubtask.create({
      data: { ticket_id: ticketId, label: dto.label.trim() },
      select: { id: true, label: true, done: true },
    });
  }

  async updateSubtask(
    ticketId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto,
    actor: TicketActor,
  ) {
    await this.ensureCanModify(ticketId, actor);

    const subtask = await this.prisma.ticketSubtask.findUnique({
      where: { id: subtaskId },
      select: { id: true, ticket_id: true },
    });

    if (!subtask || subtask.ticket_id !== ticketId) {
      throw new NotFoundException('Sous-tâche introuvable.');
    }

    return this.prisma.ticketSubtask.update({
      where: { id: subtaskId },
      data: {
        label: dto.label?.trim(),
        done: dto.done,
      },
      select: { id: true, label: true, done: true },
    });
  }

  async removeSubtask(ticketId: string, subtaskId: string, actor: TicketActor) {
    await this.ensureCanModify(ticketId, actor);

    const subtask = await this.prisma.ticketSubtask.findUnique({
      where: { id: subtaskId },
      select: { id: true, ticket_id: true },
    });

    if (!subtask || subtask.ticket_id !== ticketId) {
      throw new NotFoundException('Sous-tâche introuvable.');
    }

    await this.prisma.ticketSubtask.delete({ where: { id: subtaskId } });

    return { success: true };
  }

  async addLink(ticketId: string, dto: CreateLinkDto, actor: TicketActor) {
    await this.ensureCanModify(ticketId, actor);

    if (dto.linkedTicketId === ticketId) {
      throw new BadRequestException(
        'Un ticket ne peut pas être lié à lui-même.',
      );
    }

    await this.ensureTicketExists(dto.linkedTicketId);

    const existing = await this.prisma.ticketLink.findFirst({
      where: {
        OR: [
          { ticket_id: ticketId, linked_ticket_id: dto.linkedTicketId },
          { ticket_id: dto.linkedTicketId, linked_ticket_id: ticketId },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Ces tickets sont déjà liés.');
    }

    const link = await this.prisma.ticketLink.create({
      data: { ticket_id: ticketId, linked_ticket_id: dto.linkedTicketId },
      select: { linked_ticket: { select: linkedTicketSummarySelect } },
    });

    return link.linked_ticket;
  }

  async removeLink(
    ticketId: string,
    linkedTicketId: string,
    actor: TicketActor,
  ) {
    await this.ensureCanModify(ticketId, actor);

    const link = await this.prisma.ticketLink.findFirst({
      where: {
        OR: [
          { ticket_id: ticketId, linked_ticket_id: linkedTicketId },
          { ticket_id: linkedTicketId, linked_ticket_id: ticketId },
        ],
      },
      select: { id: true },
    });

    if (!link) {
      throw new NotFoundException('Lien introuvable.');
    }

    await this.prisma.ticketLink.delete({ where: { id: link.id } });

    return { success: true };
  }

  async setCustomField(
    ticketId: string,
    dto: SetCustomFieldDto,
    actor: TicketActor,
  ) {
    await this.ensureCanModify(ticketId, actor);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { custom_fields: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    const currentFields = isPlainObject(ticket.custom_fields)
      ? ticket.custom_fields
      : {};

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { custom_fields: { ...currentFields, [dto.key]: dto.value } },
      select: { custom_fields: true },
    });

    return updated.custom_fields;
  }

  async removeCustomField(ticketId: string, key: string, actor: TicketActor) {
    await this.ensureCanModify(ticketId, actor);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { custom_fields: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    const currentFields = isPlainObject(ticket.custom_fields)
      ? ticket.custom_fields
      : {};
    const remainingFields = Object.fromEntries(
      Object.entries(currentFields).filter(([fieldKey]) => fieldKey !== key),
    );

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { custom_fields: remainingFields },
      select: { custom_fields: true },
    });

    return updated.custom_fields;
  }

  private async ensureCanModify(id: string, actor: TicketActor) {
    const ticket = await this.getAuthorizationContext(id);

    if (
      !(await this.permissions.canModifyTicket(actor.role, actor.id, ticket))
    ) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas de modifier ce ticket.',
      );
    }

    return ticket;
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
