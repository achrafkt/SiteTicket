import { apiFetch } from './api';

export type ApiUserRef = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
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
  edited_at: string | null;
  deleted_at: string | null;
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

export type ApiTag = {
  id: string;
  label: string;
};

export type ApiSubtask = {
  id: string;
  label: string;
  done: boolean;
};

export type ApiLinkedTicketRef = {
  id: string;
  ticket_number: string;
  title: string;
  status: { code: string; name: string };
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
  cost_impact_amount: string | null;
  schedule_impact_days: number | null;
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
  tags?: ApiTag[];
  subtasks?: ApiSubtask[];
  links?: ApiLinkedTicketRef[];
  custom_fields?: Record<string, string> | null;
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
  costImpactAmount: number | null;
  scheduleImpactDays: number | null;
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
  isBlocking?: boolean;
  externalParty?: string;
  costImpactAmount?: number;
  scheduleImpactDays?: number;
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

export function updateComment(ticketId: string, commentId: string, commentText: string) {
  return apiFetch<ApiComment>(`/tickets/${ticketId}/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ commentText }),
  });
}

export function deleteComment(ticketId: string, commentId: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${ticketId}/comments/${commentId}`, {
    method: 'DELETE',
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

export function addTicketTag(ticketId: string, label: string) {
  return apiFetch<ApiTag>(`/tickets/${ticketId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function removeTicketTag(ticketId: string, tagId: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${ticketId}/tags/${tagId}`, {
    method: 'DELETE',
  });
}

export function addTicketSubtask(ticketId: string, label: string) {
  return apiFetch<ApiSubtask>(`/tickets/${ticketId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateTicketSubtask(
  ticketId: string,
  subtaskId: string,
  payload: Partial<{ label: string; done: boolean }>,
) {
  return apiFetch<ApiSubtask>(`/tickets/${ticketId}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeTicketSubtask(ticketId: string, subtaskId: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${ticketId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
}

export function addTicketLink(ticketId: string, linkedTicketId: string) {
  return apiFetch<ApiLinkedTicketRef>(`/tickets/${ticketId}/links`, {
    method: 'POST',
    body: JSON.stringify({ linkedTicketId }),
  });
}

export function removeTicketLink(ticketId: string, linkedTicketId: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${ticketId}/links/${linkedTicketId}`, {
    method: 'DELETE',
  });
}

export function setTicketCustomField(ticketId: string, key: string, value: string) {
  return apiFetch<Record<string, string>>(`/tickets/${ticketId}/custom-fields`, {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  });
}

export function removeTicketCustomField(ticketId: string, key: string) {
  return apiFetch<Record<string, string>>(
    `/tickets/${ticketId}/custom-fields/${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}
