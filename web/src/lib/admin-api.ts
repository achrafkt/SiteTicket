import { apiFetch } from './api';

export type ApiRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type ApiAdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role: ApiRole;
};

export type CreateUserPayload = {
  roleId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export function getRoles() {
  return apiFetch<ApiRole[]>('/roles');
}

export function getAdminUsers() {
  return apiFetch<ApiAdminUser[]>('/users');
}

export function createAdminUser(payload: CreateUserPayload) {
  return apiFetch<ApiAdminUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminUser(id: string, payload: UpdateUserPayload) {
  return apiFetch<ApiAdminUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(id: string) {
  return apiFetch<{ success: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export type ProjectStatusCode = 'preparation' | 'actif' | 'suspendu' | 'termine' | 'archive';

export const PROJECT_STATUS_LABELS: Record<ProjectStatusCode, string> = {
  preparation: 'En préparation',
  actif: 'Actif',
  suspendu: 'Suspendu',
  termine: 'Terminé',
  archive: 'Archivé',
};

export type ApiAdminProject = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  client_name: string | null;
  status: ProjectStatusCode;
  start_date: string | null;
  end_date_planned: string | null;
  end_date_actual: string | null;
  created_at: string;
};

export type CreateProjectPayload = {
  name: string;
  code: string;
  address?: string;
  clientName?: string;
  status?: ProjectStatusCode;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export function getAdminProjects() {
  return apiFetch<ApiAdminProject[]>('/projects');
}

export function createAdminProject(payload: CreateProjectPayload) {
  return apiFetch<ApiAdminProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminProject(id: string, payload: UpdateProjectPayload) {
  return apiFetch<ApiAdminProject>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
