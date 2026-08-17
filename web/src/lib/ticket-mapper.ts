import { API_URL, resolveAvatarUrl } from './api';
import { stripHtmlToText, truncateText } from './html-text';
import type {
  ApiAttachment,
  ApiComment,
  ApiLinkedTicketRef,
  ApiProject,
  ApiStatusHistoryEntry,
  ApiSubtask,
  ApiTag,
  ApiTicket,
  ApiTicketStatus,
  ApiTicketType,
  ApiUserRef,
} from './tickets-api';
import type {
  Attachment,
  LinkedTicketRef,
  Person,
  Project,
  SubTask,
  Tag,
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
    avatarUrl: resolveAvatarUrl(user.avatar_url),
    roleCode: user.role?.code ?? null,
    roleName: user.role?.name ?? null,
  };
}

export function mapAttachment(attachment: ApiAttachment): Attachment {
  return {
    id: attachment.id,
    fileUrl: `${API_URL}${attachment.file_url}`,
    fileName: attachment.file_name,
    fileType: attachment.file_type,
    fileSize: attachment.file_size,
    uploadedAt: attachment.uploaded_at,
    uploadedBy: mapPerson(attachment.uploader),
  };
}

export function mapComment(comment: ApiComment): TicketMessage {
  return {
    id: comment.id,
    authorId: comment.user.id,
    authorName: `${comment.user.first_name} ${comment.user.last_name}`,
    authorInitials: `${comment.user.first_name[0] ?? ''}${comment.user.last_name[0] ?? ''}`.toUpperCase(),
    authorAvatarUrl: resolveAvatarUrl(comment.user.avatar_url),
    isInternal: comment.is_internal,
    body: comment.comment_text,
    createdAt: comment.created_at,
    editedAt: comment.edited_at,
    deletedAt: comment.deleted_at,
    attachments: (comment.attachments ?? []).map(mapAttachment),
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

export function mapTag(tag: ApiTag): Tag {
  return { id: tag.id, label: tag.label };
}

export function mapSubtask(subtask: ApiSubtask): SubTask {
  return { id: subtask.id, label: subtask.label, done: subtask.done };
}

export function mapLinkedTicket(link: ApiLinkedTicketRef): LinkedTicketRef {
  return {
    id: link.id,
    reference: link.ticket_number,
    title: link.title,
    statusCode: link.status.code as TicketStatusCode,
    statusName: link.status.name,
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

export function mapProject(project: ApiProject): Project {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
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
  // `comments` on the list endpoint holds only the latest visible comment
  // (take: 1, desc); on the detail endpoint it holds the full thread in
  // chronological (asc) order. Either way its last element is the most
  // recent comment the current user is allowed to see.
  const lastComment =
    apiTicket.comments && apiTicket.comments.length > 0
      ? apiTicket.comments[apiTicket.comments.length - 1]
      : null;

  const lastActivityAt =
    lastComment && new Date(lastComment.created_at).getTime() > new Date(apiTicket.updated_at).getTime()
      ? lastComment.created_at
      : apiTicket.updated_at;

  const lastActivityPreview = lastComment
    ? lastComment.deleted_at
      ? 'Commentaire supprimé'
      : truncateText(stripHtmlToText(lastComment.comment_text), 100)
    : null;

  const lastActivityAuthor = lastComment
    ? `${lastComment.user.first_name} ${lastComment.user.last_name}`
    : null;

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
    isBlocking: apiTicket.is_blocking,
    externalParty: apiTicket.external_party,
    costImpactAmount: apiTicket.cost_impact_amount === null ? null : Number(apiTicket.cost_impact_amount),
    scheduleImpactDays: apiTicket.schedule_impact_days,
    project: apiTicket.project,
    assignees: apiTicket.assigned_to_user ? [mapPerson(apiTicket.assigned_to_user)] : [],
    reporter: mapPerson(apiTicket.created_by_user),
    dueDate: apiTicket.due_date,
    resolvedAt: apiTicket.resolved_at,
    closedAt: apiTicket.closed_at,
    createdAt: apiTicket.created_at,
    lastActivityAt,
    lastActivityPreview,
    lastActivityAuthor,
    tags: (apiTicket.tags ?? []).map(mapTag),
    watchersCount: 0,
    messages: (apiTicket.comments ?? []).map(mapComment),
    statusHistory: (apiTicket.status_history ?? []).map(mapStatusHistoryEntry),
    subTasks: (apiTicket.subtasks ?? []).map(mapSubtask),
    links: (apiTicket.links ?? []).map(mapLinkedTicket),
    customFields: apiTicket.custom_fields ?? {},
    attachments: (apiTicket.attachments ?? []).map(mapAttachment),
    planId: apiTicket.plan_id,
    planX: apiTicket.plan_x,
    planY: apiTicket.plan_y,
    planPage: apiTicket.plan_page,
    planName: apiTicket.plan?.name ?? null,
  };
}
