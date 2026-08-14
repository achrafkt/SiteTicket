import type { Person } from '@/types/ticket';

/**
 * Mirrors backend/src/common/permissions/knowledge-permissions.ts.
 * The backend is the source of truth and always re-checks on the request —
 * this only drives which controls are shown to avoid a confusing
 * click-then-403 round trip.
 */
const KNOWLEDGE_MANAGER_ROLES = ['admin', 'conducteur_travaux', 'moe', 'qse'];

export function canManageKnowledge(currentUser: Person | null): boolean {
  if (!currentUser?.roleCode) return false;
  return KNOWLEDGE_MANAGER_ROLES.includes(currentUser.roleCode);
}
