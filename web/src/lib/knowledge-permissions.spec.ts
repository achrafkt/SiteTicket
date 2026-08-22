import { describe, expect, it } from 'vitest';
import { makePerson } from '@/test-utils/fixtures';
import { canManageKnowledge } from './knowledge-permissions';

describe('canManageKnowledge', () => {
  it('is false when there is no current user', () => {
    expect(canManageKnowledge(null)).toBe(false);
  });

  it('is false for a user with no role code', () => {
    expect(canManageKnowledge(makePerson({ roleCode: null }))).toBe(false);
  });

  it('is true for admin, conducteur_travaux, moe and qse', () => {
    for (const roleCode of ['admin', 'conducteur_travaux', 'moe', 'qse']) {
      expect(canManageKnowledge(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for moa, sous_traitant, chef_chantier and observateur', () => {
    for (const roleCode of ['moa', 'sous_traitant', 'chef_chantier', 'observateur']) {
      expect(canManageKnowledge(makePerson({ roleCode }))).toBe(false);
    }
  });
});
