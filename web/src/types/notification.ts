export type NotificationEventType =
  | 'TICKET_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'NEW_COMMENT'
  | 'DUE_SOON'
  | 'MENTION';

export type NotificationTarget = {
  kind: 'ticket';
  ticketId: string;
  reference: string;
};

export type Notification = {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  target: NotificationTarget | null;
};
