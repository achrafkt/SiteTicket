import { apiFetch } from './api';
import type { ApiUserRef } from './tickets-api';

export type ApiProfileUser = Omit<ApiUserRef, 'role'> & {
  // Every user has a role in the schema (required FK) — narrower than
  // ApiUserRef's optional role, which some list endpoints omit.
  role: { code: string; name: string };
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email_notifications_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdateProfilePayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  emailNotificationsEnabled: boolean;
}>;

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export function getMe() {
  return apiFetch<ApiProfileUser>('/users/me');
}

export function updateProfile(payload: UpdateProfilePayload) {
  return apiFetch<ApiProfileUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiFetch<{ success: boolean }>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<ApiProfileUser>('/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export function removeAvatar() {
  return apiFetch<ApiProfileUser>('/users/me/avatar', {
    method: 'DELETE',
  });
}
