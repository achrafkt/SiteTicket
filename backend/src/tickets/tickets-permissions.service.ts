import { Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  QSE_RESTRICTED_TICKET_TYPE,
  TICKET_PERMISSIONS,
  TicketPermissionScope,
} from '../common/permissions/ticket-permissions';

export interface TicketAuthorizationContext {
  project_id: string;
  created_by: string;
  assigned_to: string | null;
  status_id: string;
  ticket_type: { code: string };
}

@Injectable()
export class TicketsPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  canCreateTicket(role: RoleCode): boolean {
    return TICKET_PERMISSIONS[role].canCreate;
  }

  canCommentOnTicket(role: RoleCode): boolean {
    return TICKET_PERMISSIONS[role].canComment;
  }

  canViewInternalComments(role: RoleCode): boolean {
    return TICKET_PERMISSIONS[role].canViewInternalComments;
  }

  canModifyTicket(
    role: RoleCode,
    userId: string,
    ticket: TicketAuthorizationContext,
  ) {
    return this.checkScope(TICKET_PERMISSIONS[role].modify, userId, ticket);
  }

  canAssignTicket(
    role: RoleCode,
    userId: string,
    ticket: TicketAuthorizationContext,
  ) {
    return this.checkScope(TICKET_PERMISSIONS[role].assign, userId, ticket);
  }

  canDeleteTicket(
    role: RoleCode,
    userId: string,
    ticket: TicketAuthorizationContext,
  ) {
    return this.checkScope(TICKET_PERMISSIONS[role].delete, userId, ticket);
  }

  // Attachments aren't a resource of their own in the role matrix, so the
  // ticket "delete" scope is reused with the attachment's uploader standing
  // in for ticket ownership: 'all' still means everyone, everything else
  // (own_ticket, assigned_ticket, project_member, ticket_type_safety) narrows
  // down to "only what this user uploaded themselves", and 'none' stays forbidden.
  canDeleteAttachment(
    role: RoleCode,
    userId: string,
    attachment: { uploaded_by: string },
  ): boolean {
    const scope = TICKET_PERMISSIONS[role].delete;

    if (scope === 'all') {
      return true;
    }

    if (scope === 'none') {
      return false;
    }

    return attachment.uploaded_by === userId;
  }

  private async checkScope(
    scope: TicketPermissionScope,
    userId: string,
    ticket: TicketAuthorizationContext,
  ): Promise<boolean> {
    switch (scope) {
      case 'all':
        return true;
      case 'none':
        return false;
      case 'own_ticket':
        return ticket.created_by === userId;
      case 'assigned_ticket':
        return ticket.assigned_to === userId;
      case 'ticket_type_safety':
        return ticket.ticket_type.code === QSE_RESTRICTED_TICKET_TYPE;
      case 'project_member':
        return this.isProjectMember(userId, ticket.project_id);
      default:
        return false;
    }
  }

  private async isProjectMember(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      select: { id: true },
    });

    return membership !== null;
  }
}
