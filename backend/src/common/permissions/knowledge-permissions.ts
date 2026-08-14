import { RoleCode } from '@prisma/client';

// Knowledge base content has no per-resource ownership like tickets do —
// authoring is gated purely by role. Admin + the roles most likely to own
// procedures/standards/safety content; everyone else is read-only (subject
// to each article's visible_roles).
export const KNOWLEDGE_MANAGER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.conducteur_travaux,
  RoleCode.moe,
  RoleCode.qse,
];

export function canManageKnowledge(role: RoleCode): boolean {
  return KNOWLEDGE_MANAGER_ROLES.includes(role);
}
