import type { Person, Ticket } from '@/types/ticket';

/**
 * Mirrors backend/src/common/permissions/ticket-permissions.ts.
 * The backend is the source of truth and always re-checks on the request —
 * this only drives which controls are shown as disabled to avoid a
 * confusing click-then-403 round trip.
 */
type TicketPermissionScope =
  | 'all'
  | 'own_ticket'
  | 'assigned_ticket'
  | 'project_member'
  | 'ticket_type_safety'
  | 'none';

interface TicketRolePermissions {
  modify: TicketPermissionScope;
  assign: TicketPermissionScope;
  delete: TicketPermissionScope;
  canViewInternalComments: boolean;
}

const TICKET_PERMISSIONS: Record<string, TicketRolePermissions> = {
  admin: { modify: 'all', assign: 'all', delete: 'all', canViewInternalComments: true },
  moa: { modify: 'own_ticket', assign: 'none', delete: 'own_ticket', canViewInternalComments: false },
  moe: { modify: 'project_member', assign: 'project_member', delete: 'own_ticket', canViewInternalComments: true },
  conducteur_travaux: { modify: 'all', assign: 'all', delete: 'own_ticket', canViewInternalComments: true },
  chef_chantier: { modify: 'project_member', assign: 'project_member', delete: 'own_ticket', canViewInternalComments: true },
  sous_traitant: { modify: 'assigned_ticket', assign: 'none', delete: 'none', canViewInternalComments: false },
  qse: { modify: 'ticket_type_safety', assign: 'none', delete: 'own_ticket', canViewInternalComments: true },
  observateur: { modify: 'none', assign: 'none', delete: 'own_ticket', canViewInternalComments: false },
};

const QSE_RESTRICTED_TICKET_TYPE = 'SAFETY';

function checkScope(scope: TicketPermissionScope, currentUser: Person, ticket: Ticket): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'none':
      return false;
    case 'own_ticket':
      return ticket.reporter.id === currentUser.id;
    case 'assigned_ticket':
      return ticket.assignees.some((assignee) => assignee.id === currentUser.id);
    case 'ticket_type_safety':
      return ticket.type === QSE_RESTRICTED_TICKET_TYPE;
    case 'project_member':
      // Project membership isn't available on the client — the backend enforces it.
      return true;
    default:
      return false;
  }
}

export type TicketPermissionGuard = {
  canModify: boolean;
  canAssign: boolean;
  modifyReason?: string;
  assignReason?: string;
};

export function getTicketPermissionGuard(
  currentUser: Person | null,
  ticket: Ticket,
): TicketPermissionGuard {
  const permissions = currentUser?.roleCode ? TICKET_PERMISSIONS[currentUser.roleCode] : undefined;

  if (!currentUser || !permissions) {
    return { canModify: true, canAssign: true };
  }

  const canModify = checkScope(permissions.modify, currentUser, ticket);
  const canAssign = checkScope(permissions.assign, currentUser, ticket);

  return {
    canModify,
    canAssign,
    modifyReason: canModify ? undefined : 'Votre rôle ne permet pas de modifier ce ticket.',
    assignReason: canAssign ? undefined : "Votre rôle ne permet pas d'assigner ce ticket.",
  };
}

// Whether the current user's role may see/post internal ("private") ticket
// comments — mirrors backend TicketsPermissionsService.canViewInternalComments.
// The backend re-checks and is the source of truth; this only drives the UI
// (hiding the "Commentaire privé" tab) to avoid a confusing dead control.
export function canViewInternalComments(currentUser: Person | null): boolean {
  if (!currentUser?.roleCode) {
    return true;
  }

  return TICKET_PERMISSIONS[currentUser.roleCode]?.canViewInternalComments ?? true;
}

// Attachments aren't their own resource in the role matrix, so the ticket
// "delete" scope is reused with the attachment's uploader standing in for
// ticket ownership — mirrors backend TicketsPermissionsService.canDeleteAttachment.
export function canDeleteAttachment(currentUser: Person | null, uploaderId: string): boolean {
  const scope = currentUser?.roleCode ? TICKET_PERMISSIONS[currentUser.roleCode]?.delete : undefined;

  if (!currentUser || !scope) {
    return true;
  }

  if (scope === 'all') {
    return true;
  }

  if (scope === 'none') {
    return false;
  }

  return uploaderId === currentUser.id;
}

const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

// Author-only, 15-minute correction window — mirrors backend
// TicketsPermissionsService.canEditComment. UI-only advisory check; the
// backend re-checks and is authoritative.
export function canEditComment(
  currentUser: Person | null,
  message: { authorId: string; createdAt: string },
): boolean {
  if (!currentUser || message.authorId !== currentUser.id) {
    return false;
  }

  return Date.now() - new Date(message.createdAt).getTime() <= COMMENT_EDIT_WINDOW_MS;
}

// Mirrors backend TicketsPermissionsService.canDeleteComment: admin (delete
// scope === 'all') may delete any comment at any time; everyone else only
// their own comment within the same correction window as editing.
export function canDeleteComment(
  currentUser: Person | null,
  message: { authorId: string; createdAt: string },
): boolean {
  const scope = currentUser?.roleCode ? TICKET_PERMISSIONS[currentUser.roleCode]?.delete : undefined;

  if (currentUser && scope === 'all') {
    return true;
  }

  return canEditComment(currentUser, message);
}
