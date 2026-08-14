import type { Notification, NotificationEventType } from '@/types/notification';
import type { Ticket } from '@/types/ticket';

type NotificationTemplate = {
  type: NotificationEventType;
  title: (ticket: Ticket) => string;
  message: (ticket: Ticket) => string;
  minutesAgo: number;
  read: boolean;
};

const TEMPLATES: NotificationTemplate[] = [
  {
    type: 'TICKET_ASSIGNED',
    title: (ticket) => `Ticket assigné : ${ticket.reference}`,
    message: (ticket) => `"${ticket.title}" vous a été assigné.`,
    minutesAgo: 8,
    read: false,
  },
  {
    type: 'NEW_COMMENT',
    title: (ticket) => `Nouveau commentaire sur ${ticket.reference}`,
    message: (ticket) => `Un commentaire a été ajouté sur "${ticket.title}".`,
    minutesAgo: 34,
    read: false,
  },
  {
    type: 'STATUS_CHANGED',
    title: (ticket) => `Statut modifié : ${ticket.reference}`,
    message: (ticket) => `"${ticket.title}" est passé au statut "${ticket.statusName}".`,
    minutesAgo: 95,
    read: false,
  },
  {
    type: 'DUE_SOON',
    title: (ticket) => `Échéance proche : ${ticket.reference}`,
    message: (ticket) => `"${ticket.title}" arrive à échéance bientôt.`,
    minutesAgo: 240,
    read: true,
  },
  {
    type: 'MENTION',
    title: (ticket) => `Vous avez été mentionné sur ${ticket.reference}`,
    message: (ticket) => `Vous avez été mentionné dans un commentaire sur "${ticket.title}".`,
    minutesAgo: 1440,
    read: true,
  },
];

export function buildMockNotifications(tickets: Ticket[]): Notification[] {
  if (tickets.length === 0) return [];

  const now = Date.now();
  return TEMPLATES.map((template, index) => {
    const ticket = tickets[index % tickets.length];
    return {
      id: `mock-notification-${index}`,
      type: template.type,
      title: template.title(ticket),
      message: template.message(ticket),
      createdAt: new Date(now - template.minutesAgo * 60_000).toISOString(),
      read: template.read,
      target: { kind: 'ticket', ticketId: ticket.id, reference: ticket.reference },
    };
  });
}
