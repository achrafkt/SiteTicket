import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
  addProjectMember,
  createAdminProject,
  createAdminUser,
  deleteAdminUser,
  getAdminProjects,
  getAdminUsers,
  getProjectMembers,
  getRoles,
  removeProjectMember,
  updateAdminProject,
  updateAdminUser,
} from './admin-api';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
  mockedApiFetch.mockResolvedValue(undefined);
});

describe('admin-api users', () => {
  it('getRoles fetches /roles', () => {
    getRoles();
    expect(mockedApiFetch).toHaveBeenCalledWith('/roles');
  });

  it('getAdminUsers fetches /users', () => {
    getAdminUsers();
    expect(mockedApiFetch).toHaveBeenCalledWith('/users');
  });

  it('createAdminUser POSTs the payload as JSON to /users', () => {
    const payload = {
      roleId: 'role-1',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      password: 'secret',
    };
    createAdminUser(payload);
    expect(mockedApiFetch).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updateAdminUser PATCHes /users/:id', () => {
    updateAdminUser('user-1', { firstName: 'Jean' });
    expect(mockedApiFetch).toHaveBeenCalledWith('/users/user-1', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Jean' }),
    });
  });

  it('deleteAdminUser DELETEs /users/:id', () => {
    deleteAdminUser('user-1');
    expect(mockedApiFetch).toHaveBeenCalledWith('/users/user-1', { method: 'DELETE' });
  });
});

describe('admin-api projects', () => {
  it('getAdminProjects fetches /projects', () => {
    getAdminProjects();
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects');
  });

  it('createAdminProject POSTs the payload as JSON to /projects', () => {
    const payload = { name: 'Chantier A', code: 'CHA' };
    createAdminProject(payload);
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updateAdminProject PATCHes /projects/:id', () => {
    updateAdminProject('project-1', { status: 'actif' });
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects/project-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'actif' }),
    });
  });

  it('getProjectMembers fetches /projects/:id/members', () => {
    getProjectMembers('project-1');
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects/project-1/members');
  });

  it('addProjectMember POSTs the payload to /projects/:id/members', () => {
    addProjectMember('project-1', { userId: 'user-1', roleOnProject: 'chef' });
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects/project-1/members', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', roleOnProject: 'chef' }),
    });
  });

  it('removeProjectMember DELETEs /projects/:id/members/:userId', () => {
    removeProjectMember('project-1', 'user-1');
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects/project-1/members/user-1', {
      method: 'DELETE',
    });
  });
});
