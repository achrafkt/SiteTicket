import { RoleCode } from '@prisma/client';

// Roles with cross-chantier oversight: they see every chantier regardless of
// ProjectMember rows. Field roles (chef de chantier, sous-traitant, qse,
// observateur) only see chantiers they've been added to as a member —
// mirrors the 'project_member' scope already used for tickets.
export const PROJECT_HUB_BROAD_VIEW_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moa,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
];

// Create/edit chantier identity (name, address, dates, status, budget
// prévisionnel). Financial + contractual info, kept to the same roles that
// already manage /settings/projects plus MOE.
export const PROJECT_HUB_INFO_MANAGER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moa,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
];

// Day-to-day field tracking: tasks and global progress. This is the
// "chef de chantier au quotidien" layer, so it's broader than info/budget.
export const PROJECT_HUB_FIELD_MANAGER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
  RoleCode.chef_chantier,
];

// Logging actual expenses is kept out of chef_chantier's hands — they see the
// budget (canViewBudget) but cost entry stays with the roles accountable for
// the financials.
export const PROJECT_HUB_BUDGET_MANAGER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
];

// Who can see budget figures (montant prévisionnel, dépenses, écart) at all.
// Left out: sous_traitant, qse, observateur — same rationale as knowledge
// base's manager-only visibility, applied here to financial data instead.
export const PROJECT_HUB_BUDGET_VIEWER_ROLES: RoleCode[] = [
  RoleCode.admin,
  RoleCode.moa,
  RoleCode.moe,
  RoleCode.conducteur_travaux,
  RoleCode.chef_chantier,
];

export function hasBroadProjectView(role: RoleCode): boolean {
  return PROJECT_HUB_BROAD_VIEW_ROLES.includes(role);
}

export function canManageProjectInfo(role: RoleCode): boolean {
  return PROJECT_HUB_INFO_MANAGER_ROLES.includes(role);
}

export function canManageProjectField(role: RoleCode): boolean {
  return PROJECT_HUB_FIELD_MANAGER_ROLES.includes(role);
}

export function canManageProjectBudget(role: RoleCode): boolean {
  return PROJECT_HUB_BUDGET_MANAGER_ROLES.includes(role);
}

export function canViewProjectBudget(role: RoleCode): boolean {
  return PROJECT_HUB_BUDGET_VIEWER_ROLES.includes(role);
}
