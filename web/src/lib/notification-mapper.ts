import type { ApiNotification } from './notifications-api';
import type { Notification, NotificationTarget } from '@/types/notification';

function mapTarget(notification: ApiNotification): NotificationTarget | null {
  if (notification.ticket) {
    return { kind: 'ticket', ticketId: notification.ticket.id, reference: notification.ticket.ticket_number };
  }
  if (notification.project) {
    return { kind: 'project', projectId: notification.project.id, name: notification.project.name };
  }
  return null;
}

export function mapNotification(notification: ApiNotification): Notification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.created_at,
    read: notification.read_at !== null,
    target: mapTarget(notification),
  };
}
