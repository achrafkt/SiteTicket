import { describe, expect, it } from 'vitest';
import { makePerson, makeTicket } from '@/test-utils/fixtures';
import {
  canDeleteAttachment,
  canDeleteComment,
  canEditComment,
  canViewInternalComments,
  getTicketPermissionGuard,
} from './ticket-permissions';

describe('getTicketPermissionGuard', () => {
  it('allows everything when there is no current user', () => {
    const ticket = makeTicket();
    const guard = getTicketPermissionGuard(null, ticket);
    expect(guard).toEqual({ canModify: true, canAssign: true });
  });

  it('allows everything for an unknown role code', () => {
    const user = makePerson({ roleCode: 'unknown_role' });
    const ticket = makeTicket();
    const guard = getTicketPermissionGuard(user, ticket);
    expect(guard).toEqual({ canModify: true, canAssign: true });
  });

  it('grants admin full modify and assign rights', () => {
    const admin = makePerson({ roleCode: 'admin' });
    const ticket = makeTicket({ reporter: makePerson({ id: 'someone-else' }) });
    const guard = getTicketPermissionGuard(admin, ticket);
    expect(guard.canModify).toBe(true);
    expect(guard.canAssign).toBe(true);
    expect(guard.modifyReason).toBeUndefined();
    expect(guard.assignReason).toBeUndefined();
  });

  it('lets moa modify only their own reported ticket, and never assign', () => {
    const moa = makePerson({ id: 'moa-1', roleCode: 'moa' });
    const ownTicket = makeTicket({ reporter: makePerson({ id: 'moa-1' }) });
    const otherTicket = makeTicket({ reporter: makePerson({ id: 'someone-else' }) });

    expect(getTicketPermissionGuard(moa, ownTicket).canModify).toBe(true);
    expect(getTicketPermissionGuard(moa, otherTicket).canModify).toBe(false);
    expect(getTicketPermissionGuard(moa, otherTicket).modifyReason).toBe(
      'Votre rôle ne permet pas de modifier ce ticket.',
    );
    expect(getTicketPermissionGuard(moa, ownTicket).canAssign).toBe(false);
    expect(getTicketPermissionGuard(moa, ownTicket).assignReason).toBe(
      "Votre rôle ne permet pas d'assigner ce ticket.",
    );
  });

  it('lets sous_traitant modify only tickets they are assigned to, and never assign', () => {
    const subcontractor = makePerson({ id: 'sub-1', roleCode: 'sous_traitant' });
    const assignedTicket = makeTicket({ assignees: [makePerson({ id: 'sub-1' })] });
    const unassignedTicket = makeTicket({ assignees: [makePerson({ id: 'someone-else' })] });

    expect(getTicketPermissionGuard(subcontractor, assignedTicket).canModify).toBe(true);
    expect(getTicketPermissionGuard(subcontractor, unassignedTicket).canModify).toBe(false);
    expect(getTicketPermissionGuard(subcontractor, assignedTicket).canAssign).toBe(false);
  });

  it('lets qse modify only SAFETY-typed tickets', () => {
    const qse = makePerson({ roleCode: 'qse' });
    const safetyTicket = makeTicket({ type: 'SAFETY' });
    const otherTicket = makeTicket({ type: 'RFI' });

    expect(getTicketPermissionGuard(qse, safetyTicket).canModify).toBe(true);
    expect(getTicketPermissionGuard(qse, otherTicket).canModify).toBe(false);
  });

  it('treats project_member scope as always allowed client-side (moe)', () => {
    const moe = makePerson({ roleCode: 'moe' });
    const ticket = makeTicket();
    const guard = getTicketPermissionGuard(moe, ticket);
    expect(guard.canModify).toBe(true);
    expect(guard.canAssign).toBe(true);
  });

  it('denies observateur any modify or assign rights', () => {
    const observer = makePerson({ roleCode: 'observateur' });
    const ticket = makeTicket({ reporter: makePerson({ id: 'observer-does-not-own-this' }) });
    const guard = getTicketPermissionGuard(observer, ticket);
    expect(guard.canModify).toBe(false);
    expect(guard.canAssign).toBe(false);
  });

  it('grants conducteur_travaux modify all but assign scoped to all as well', () => {
    const ct = makePerson({ roleCode: 'conducteur_travaux' });
    const ticket = makeTicket({ reporter: makePerson({ id: 'someone-else' }) });
    const guard = getTicketPermissionGuard(ct, ticket);
    expect(guard.canModify).toBe(true);
    expect(guard.canAssign).toBe(true);
  });
});

describe('canViewInternalComments', () => {
  it('defaults to true when there is no current user', () => {
    expect(canViewInternalComments(null)).toBe(true);
  });

  it('defaults to true for an unknown role code', () => {
    expect(canViewInternalComments(makePerson({ roleCode: 'unknown_role' }))).toBe(true);
  });

  it('is true for roles allowed to view internal comments', () => {
    expect(canViewInternalComments(makePerson({ roleCode: 'admin' }))).toBe(true);
    expect(canViewInternalComments(makePerson({ roleCode: 'moe' }))).toBe(true);
    expect(canViewInternalComments(makePerson({ roleCode: 'chef_chantier' }))).toBe(true);
    expect(canViewInternalComments(makePerson({ roleCode: 'qse' }))).toBe(true);
  });

  it('is false for roles excluded from internal comments', () => {
    expect(canViewInternalComments(makePerson({ roleCode: 'moa' }))).toBe(false);
    expect(canViewInternalComments(makePerson({ roleCode: 'sous_traitant' }))).toBe(false);
    expect(canViewInternalComments(makePerson({ roleCode: 'observateur' }))).toBe(false);
  });
});

describe('canDeleteAttachment', () => {
  it('defaults to true when there is no current user', () => {
    expect(canDeleteAttachment(null, 'uploader-1')).toBe(true);
  });

  it('is always true for a role with the "all" delete scope (admin)', () => {
    const admin = makePerson({ id: 'admin-1', roleCode: 'admin' });
    expect(canDeleteAttachment(admin, 'someone-else')).toBe(true);
  });

  it('is always false for a role with the "none" delete scope (sous_traitant)', () => {
    const subcontractor = makePerson({ id: 'sub-1', roleCode: 'sous_traitant' });
    expect(canDeleteAttachment(subcontractor, 'sub-1')).toBe(false);
  });

  it('falls back to uploader-id equality for own-ticket scoped roles (moa)', () => {
    const moa = makePerson({ id: 'moa-1', roleCode: 'moa' });
    expect(canDeleteAttachment(moa, 'moa-1')).toBe(true);
    expect(canDeleteAttachment(moa, 'someone-else')).toBe(false);
  });
});

describe('canEditComment', () => {
  const currentUser = makePerson({ id: 'author-1' });

  it('is false when there is no current user', () => {
    expect(canEditComment(null, { authorId: 'author-1', createdAt: new Date().toISOString() })).toBe(
      false,
    );
  });

  it('is false when the current user is not the author', () => {
    const message = { authorId: 'someone-else', createdAt: new Date().toISOString() };
    expect(canEditComment(currentUser, message)).toBe(false);
  });

  it('is true within the 15-minute correction window', () => {
    const message = { authorId: 'author-1', createdAt: new Date(Date.now() - 60_000).toISOString() };
    expect(canEditComment(currentUser, message)).toBe(true);
  });

  it('is false past the 15-minute correction window', () => {
    const message = {
      authorId: 'author-1',
      createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    };
    expect(canEditComment(currentUser, message)).toBe(false);
  });
});

describe('canDeleteComment', () => {
  it('lets admin delete any comment regardless of age', () => {
    const admin = makePerson({ id: 'admin-1', roleCode: 'admin' });
    const oldMessage = {
      authorId: 'someone-else',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    expect(canDeleteComment(admin, oldMessage)).toBe(true);
  });

  it('falls back to the edit window for non-admin roles', () => {
    const moa = makePerson({ id: 'moa-1', roleCode: 'moa' });
    const recentOwnMessage = { authorId: 'moa-1', createdAt: new Date().toISOString() };
    const oldOwnMessage = {
      authorId: 'moa-1',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    expect(canDeleteComment(moa, recentOwnMessage)).toBe(true);
    expect(canDeleteComment(moa, oldOwnMessage)).toBe(false);
  });

  it('denies non-admin deleting someone else\'s comment', () => {
    const moa = makePerson({ id: 'moa-1', roleCode: 'moa' });
    const othersMessage = { authorId: 'someone-else', createdAt: new Date().toISOString() };
    expect(canDeleteComment(moa, othersMessage)).toBe(false);
  });
});
