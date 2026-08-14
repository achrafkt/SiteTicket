import type { ElementType } from 'react';
import { Activity, Archive, CheckCircle2, CirclePause, Clock } from 'lucide-react';
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
  avatar_url: string | null;
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

// Colored icons replace plain status dots everywhere a chantier status is
// shown (settings table, project-hub cards/detail) — mirrors the
// icon/iconClassName/iconBgClassName pattern used for ticket statuses in
// components/tickets/ticket-visuals.ts.
export const PROJECT_STATUS_ICONS: Record<ProjectStatusCode, ElementType> = {
  preparation: Clock,
  actif: Activity,
  suspendu: CirclePause,
  termine: CheckCircle2,
  archive: Archive,
};

export const PROJECT_STATUS_ICON_CLASSES: Record<ProjectStatusCode, string> = {
  preparation: 'text-amber-600',
  actif: 'text-emerald-600',
  suspendu: 'text-orange-600',
  termine: 'text-slate-500',
  archive: 'text-gray-400',
};

export const PROJECT_STATUS_ICON_BG_CLASSES: Record<ProjectStatusCode, string> = {
  preparation: 'bg-amber-50',
  actif: 'bg-emerald-50',
  suspendu: 'bg-orange-50',
  termine: 'bg-slate-100',
  archive: 'bg-gray-100',
};

export type ApiProjectMemberUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  role: { code: string; name: string };
};

export type ApiProjectMember = {
  id: string;
  role_on_project: string | null;
  added_at: string;
  user: ApiProjectMemberUser;
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
  _count: { members: number };
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

export function getProjectMembers(projectId: string) {
  return apiFetch<ApiProjectMember[]>(`/projects/${projectId}/members`);
}

export function addProjectMember(
  projectId: string,
  payload: { userId: string; roleOnProject?: string },
) {
  return apiFetch<ApiProjectMember>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeProjectMember(projectId: string, userId: string) {
  return apiFetch<{ success: boolean }>(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}
