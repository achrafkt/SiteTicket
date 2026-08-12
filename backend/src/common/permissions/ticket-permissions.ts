import { RoleCode, TicketTypeCode } from '@prisma/client';

/**
 * Scope a role is allowed to act within for a given ticket action.
 * - all: no restriction
 * - own_ticket: only tickets the user created
 * - assigned_ticket: only tickets assigned to the user
 * - project_member: only tickets in a project the user is a member of
 * - ticket_type_safety: only tickets whose type is the QSE non-conformity type
 * - none: never allowed
 */
export type TicketPermissionScope =
  | 'all'
  | 'own_ticket'
  | 'assigned_ticket'
  | 'project_member'
  | 'ticket_type_safety'
  | 'none';

export interface TicketRolePermissions {
  canCreate: boolean;
  canComment: boolean;
  // Whether this role can see/post internal ("private") comments. External
  // roles (MOA, sous-traitant, observateur) are restricted to public
  // comments only — see is_internal filtering in TicketsService.findOne.
  canViewInternalComments: boolean;
  modify: TicketPermissionScope;
  assign: TicketPermissionScope;
  delete: TicketPermissionScope;
}

// Mirrors the role/ticket permission matrix validated with the product owner.
// "Bureau de contrôle/QSE" is restricted to tickets of type SAFETY (used as the
// "Non-conformité QSE" ticket type — no dedicated type exists in the schema).
export const TICKET_PERMISSIONS: Record<RoleCode, TicketRolePermissions> = {
  [RoleCode.admin]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: true,
    modify: 'all',
    assign: 'all',
    delete: 'all',
  },
  [RoleCode.moa]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: false,
    modify: 'own_ticket',
    assign: 'none',
    delete: 'own_ticket',
  },
  [RoleCode.moe]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: true,
    modify: 'project_member',
    assign: 'project_member',
    delete: 'own_ticket',
  },
  [RoleCode.conducteur_travaux]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: true,
    modify: 'all',
    assign: 'all',
    delete: 'own_ticket',
  },
  [RoleCode.chef_chantier]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: true,
    modify: 'project_member',
    assign: 'project_member',
    delete: 'own_ticket',
  },
  [RoleCode.sous_traitant]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: false,
    modify: 'assigned_ticket',
    assign: 'none',
    delete: 'none',
  },
  [RoleCode.qse]: {
    canCreate: true,
    canComment: true,
    canViewInternalComments: true,
    modify: 'ticket_type_safety',
    assign: 'none',
    delete: 'own_ticket',
  },
  [RoleCode.observateur]: {
    canCreate: false,
    canComment: true,
    canViewInternalComments: false,
    modify: 'none',
    assign: 'none',
    delete: 'own_ticket',
  },
};

export const QSE_RESTRICTED_TICKET_TYPE: TicketTypeCode = TicketTypeCode.SAFETY;
