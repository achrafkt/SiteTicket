import { describe, expect, it } from 'vitest';
import { makePerson } from '@/test-utils/fixtures';
import {
  canManageProjectBudget,
  canManageProjectField,
  canManageProjectInfo,
  canViewProjectBudget,
  hasBroadProjectView,
} from './project-hub-permissions';

describe('hasBroadProjectView', () => {
  it('is false when there is no current user', () => {
    expect(hasBroadProjectView(null)).toBe(false);
  });

  it('is true for admin, moa, moe and conducteur_travaux', () => {
    for (const roleCode of ['admin', 'moa', 'moe', 'conducteur_travaux']) {
      expect(hasBroadProjectView(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for chef_chantier, sous_traitant, qse and observateur', () => {
    for (const roleCode of ['chef_chantier', 'sous_traitant', 'qse', 'observateur']) {
      expect(hasBroadProjectView(makePerson({ roleCode }))).toBe(false);
    }
  });
});

describe('canManageProjectInfo', () => {
  it('is true for admin, moa, moe and conducteur_travaux', () => {
    for (const roleCode of ['admin', 'moa', 'moe', 'conducteur_travaux']) {
      expect(canManageProjectInfo(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for chef_chantier', () => {
    expect(canManageProjectInfo(makePerson({ roleCode: 'chef_chantier' }))).toBe(false);
  });

  it('is false when there is no current user', () => {
    expect(canManageProjectInfo(null)).toBe(false);
  });
});

describe('canManageProjectField', () => {
  it('is true for admin, moe, conducteur_travaux and chef_chantier', () => {
    for (const roleCode of ['admin', 'moe', 'conducteur_travaux', 'chef_chantier']) {
      expect(canManageProjectField(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for moa (excluded from field management)', () => {
    expect(canManageProjectField(makePerson({ roleCode: 'moa' }))).toBe(false);
  });
});

describe('canManageProjectBudget', () => {
  it('is true for admin, moe and conducteur_travaux', () => {
    for (const roleCode of ['admin', 'moe', 'conducteur_travaux']) {
      expect(canManageProjectBudget(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for chef_chantier (view-only on budget)', () => {
    expect(canManageProjectBudget(makePerson({ roleCode: 'chef_chantier' }))).toBe(false);
  });

  it('is false for moa', () => {
    expect(canManageProjectBudget(makePerson({ roleCode: 'moa' }))).toBe(false);
  });
});

describe('canViewProjectBudget', () => {
  it('is true for admin, moa, moe, conducteur_travaux and chef_chantier', () => {
    for (const roleCode of ['admin', 'moa', 'moe', 'conducteur_travaux', 'chef_chantier']) {
      expect(canViewProjectBudget(makePerson({ roleCode }))).toBe(true);
    }
  });

  it('is false for sous_traitant, qse and observateur', () => {
    for (const roleCode of ['sous_traitant', 'qse', 'observateur']) {
      expect(canViewProjectBudget(makePerson({ roleCode }))).toBe(false);
    }
  });

  it('is false when there is no current user', () => {
    expect(canViewProjectBudget(null)).toBe(false);
  });
});
