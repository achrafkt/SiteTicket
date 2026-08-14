import type { Person } from '@/types/ticket';

/**
 * Mirrors backend/src/common/permissions/project-hub-permissions.ts.
 * The backend is the source of truth and always re-checks on the request —
 * this only drives which controls are shown to avoid a confusing
 * click-then-403 round trip. Membership-scoped checks (chef_chantier limited
 * to chantiers they belong to) can only be resolved server-side, so this
 * file only covers the role-level part of the matrix.
 */
const PROJECT_HUB_INFO_MANAGER_ROLES = ['admin', 'moa', 'moe', 'conducteur_travaux'];
const PROJECT_HUB_FIELD_MANAGER_ROLES = ['admin', 'moe', 'conducteur_travaux', 'chef_chantier'];
const PROJECT_HUB_BUDGET_MANAGER_ROLES = ['admin', 'moe', 'conducteur_travaux'];
const PROJECT_HUB_BUDGET_VIEWER_ROLES = [
  'admin',
  'moa',
  'moe',
  'conducteur_travaux',
  'chef_chantier',
];

function hasRole(currentUser: Person | null, roles: string[]): boolean {
  if (!currentUser?.roleCode) return false;
  return roles.includes(currentUser.roleCode);
}

export function canManageProjectInfo(currentUser: Person | null): boolean {
  return hasRole(currentUser, PROJECT_HUB_INFO_MANAGER_ROLES);
}

export function canManageProjectField(currentUser: Person | null): boolean {
  return hasRole(currentUser, PROJECT_HUB_FIELD_MANAGER_ROLES);
}

export function canManageProjectBudget(currentUser: Person | null): boolean {
  return hasRole(currentUser, PROJECT_HUB_BUDGET_MANAGER_ROLES);
}

export function canViewProjectBudget(currentUser: Person | null): boolean {
  return hasRole(currentUser, PROJECT_HUB_BUDGET_VIEWER_ROLES);
}
