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

export type ApiAttachment = {
  id: string;
  comment_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  uploaded_at: string;
  uploader: ApiUserRef;
};

export type ApiComment = {
  id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  user: ApiUserRef;
  attachments?: ApiAttachment[];
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
  attachments?: ApiAttachment[];
};

export type ApiProject = {
  id: string;
  name: string;
  code: string;
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
  assignedTo: string | null;
  statusId: string;
}>;

export type CreateTicketPayload = {
  projectId: string;
  ticketTypeId: string;
  title: string;
  description?: string;
  priority?: string;
  locationZone?: string;
  trade?: string;
  dueDate?: string;
  assignedTo?: string;
};

export function getTickets() {
  return apiFetch<ApiTicket[]>('/tickets');
}

export function createTicket(payload: CreateTicketPayload) {
  return apiFetch<ApiTicket>('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProjects() {
  return apiFetch<ApiProject[]>('/projects');
}

export const ALLOWED_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export function uploadAttachment(ticketId: string, file: File, commentId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (commentId) {
    formData.append('commentId', commentId);
  }

  return apiFetch<ApiAttachment>(`/tickets/${ticketId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteAttachment(ticketId: string, attachmentId: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
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

export function deleteTicket(id: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${id}`, {
    method: 'DELETE',
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

export function getAssignableUsers() {
  return apiFetch<ApiUserRef[]>('/users/assignable');
}
