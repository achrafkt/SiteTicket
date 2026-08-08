import type {
  ApiComment,
  ApiStatusHistoryEntry,
  ApiTicket,
  ApiTicketStatus,
  ApiTicketType,
  ApiUserRef,
} from './tickets-api';
import type {
  Person,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TicketStatusCode,
  TicketStatusHistoryEntry,
  TicketType,
  TicketTypeCode,
} from '@/types/ticket';

export function mapPerson(user: ApiUserRef): Person {
  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    initials: `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase(),
    email: user.email,
    roleCode: user.role?.code ?? null,
    roleName: user.role?.name ?? null,
  };
}

export function mapComment(comment: ApiComment): TicketMessage {
  return {
    id: comment.id,
    authorName: `${comment.user.first_name} ${comment.user.last_name}`,
    authorInitials: `${comment.user.first_name[0] ?? ''}${comment.user.last_name[0] ?? ''}`.toUpperCase(),
    isInternal: comment.is_internal,
    body: comment.comment_text,
    createdAt: comment.created_at,
  };
}

export function mapStatusHistoryEntry(entry: ApiStatusHistoryEntry): TicketStatusHistoryEntry {
  return {
    id: entry.id,
    fromStatusCode: (entry.from_status?.code as TicketStatusCode) ?? null,
    fromStatusName: entry.from_status?.name ?? null,
    toStatusCode: entry.to_status.code as TicketStatusCode,
    toStatusName: entry.to_status.name,
    changedBy: `${entry.changed_by_user.first_name} ${entry.changed_by_user.last_name}`,
    changedAt: entry.changed_at,
  };
}

export function mapStatus(status: ApiTicketStatus): TicketStatus {
  return {
    id: status.id,
    code: status.code as TicketStatusCode,
    name: status.name,
    sortOrder: status.sort_order,
    isTerminal: status.is_terminal,
  };
}

export function mapType(type: ApiTicketType): TicketType {
  return {
    id: type.id,
    code: type.code as TicketTypeCode,
    name: type.name,
    requiresApprovalChain: type.requires_approval_chain,
  };
}

export function mapTicket(apiTicket: ApiTicket): Ticket {
  return {
    id: apiTicket.id,
    reference: apiTicket.ticket_number,
    title: apiTicket.title,
    description: apiTicket.description ?? '',
    statusId: apiTicket.status.id,
    status: apiTicket.status.code as TicketStatusCode,
    statusName: apiTicket.status.name,
    statusIsTerminal: apiTicket.status.is_terminal,
    priority: apiTicket.priority as TicketPriority,
    typeId: apiTicket.ticket_type.id,
    type: apiTicket.ticket_type.code as TicketTypeCode,
    typeName: apiTicket.ticket_type.name,
    lot: apiTicket.location_zone,
    trade: apiTicket.trade,
    project: apiTicket.project,
    assignees: apiTicket.assigned_to_user ? [mapPerson(apiTicket.assigned_to_user)] : [],
    reporter: mapPerson(apiTicket.created_by_user),
    dueDate: apiTicket.due_date,
    createdAt: apiTicket.created_at,
    tags: [],
    watchersCount: 0,
    messages: (apiTicket.comments ?? []).map(mapComment),
    statusHistory: (apiTicket.status_history ?? []).map(mapStatusHistoryEntry),
    subTasks: [],
    linkedTicketIds: [],
  };
}
