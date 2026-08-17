export type NotificationEventType =
  | 'TICKET_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'MENTION'
  | 'DUE_SOON'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_MEMBER_REMOVED';

export type NotificationTarget =
  | { kind: 'ticket'; ticketId: string; reference: string }
  | { kind: 'project'; projectId: string; name: string };

export type Notification = {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  target: NotificationTarget | null;
};
