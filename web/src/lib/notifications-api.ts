import { apiFetch } from './api';
import type { NotificationEventType } from '@/types/notification';

export type ApiNotification = {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  ticket: { id: string; ticket_number: string } | null;
  project: { id: string; name: string } | null;
};

export function getNotifications(unreadOnly = false) {
  const query = unreadOnly ? '?unreadOnly=true' : '';
  return apiFetch<ApiNotification[]>(`/notifications${query}`);
}

export function getUnreadNotificationCount() {
  return apiFetch<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiFetch<{ success: boolean }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiFetch<{ success: boolean }>('/notifications/read-all', {
    method: 'POST',
  });
}
