import { apiFetch } from './api';

export type ApiUserRef = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: { code: string; name: string } | null;
};

export type ApiTicketStatus = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_terminal: boolean;
};

export type ApiTicketType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  requires_approval_chain: boolean;
};

export type ApiComment = {
  id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  user: ApiUserRef;
};

export type ApiStatusHistoryEntry = {
  id: string;
  comment: string | null;
  changed_at: string;
  from_status: { id: string; code: string; name: string } | null;
  to_status: { id: string; code: string; name: string };
  changed_by_user: ApiUserRef;
};

export type ApiTicket = {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  priority: string;
  is_blocking: boolean;
  location_zone: string | null;
  trade: string | null;
  external_party: string | null;
  due_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  project: { id: string; name: string; code: string };
  ticket_type: { id: string; code: string; name: string };
  status: { id: string; code: string; name: string; sort_order: number; is_terminal: boolean };
  created_by_user: ApiUserRef;
  assigned_to_user: ApiUserRef | null;
  comments?: ApiComment[];
  status_history?: ApiStatusHistoryEntry[];
};

export type UpdateTicketPayload = Partial<{
  title: string;
  description: string;
  priority: string;
  isBlocking: boolean;
  locationZone: string;
  trade: string;
  externalParty: string;
  dueDate: string;
  assignedTo: string;
  statusId: string;
}>;

export function getTickets() {
  return apiFetch<ApiTicket[]>('/tickets');
}

export function getTicket(id: string) {
  return apiFetch<ApiTicket>(`/tickets/${id}`);
}

export function updateTicket(id: string, payload: UpdateTicketPayload) {
  return apiFetch<ApiTicket>(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createComment(ticketId: string, commentText: string, isInternal: boolean) {
  return apiFetch<ApiComment>(`/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ commentText, isInternal }),
  });
}

export function getTicketStatuses() {
  return apiFetch<ApiTicketStatus[]>('/ticket-statuses');
}

export function getTicketTypes() {
  return apiFetch<ApiTicketType[]>('/ticket-types');
}
