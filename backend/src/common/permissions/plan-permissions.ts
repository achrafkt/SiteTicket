import { RoleCode } from '@prisma/client';

// Uploading/versioning site plans is a field-management action, kept to the
// same roles that already manage day-to-day chantier tracking in the Project
// Hub (see PROJECT_HUB_FIELD_MANAGER_ROLES) — chef_chantier included since
// they're the one physically carrying updated drawings on site.
export const PLAN_MANAGER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
  RoleCode.chef_chantier,
];

export function canManagePlans(role: RoleCode): boolean {
  return PLAN_MANAGER_ROLES.includes(role);
}
