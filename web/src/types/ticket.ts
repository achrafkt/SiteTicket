export type TicketStatusCode =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketTypeCode =
  | 'RFI'
  | 'PUNCH'
  | 'CHANGE_ORDER'
  | 'SAFETY'
  | 'MAINTENANCE'
  | 'SUBMITTAL'
  | 'FIELD_ISSUE';

export type TicketStatus = {
  id: string;
  code: TicketStatusCode;
  name: string;
  sortOrder: number;
  isTerminal: boolean;
};

export type TicketType = {
  id: string;
  code: TicketTypeCode;
  name: string;
  requiresApprovalChain: boolean;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl: string | null;
  roleCode: string | null;
  roleName: string | null;
};

export type Project = {
  id: string;
  name: string;
  code: string;
};

export type Attachment = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: Person;
};

export type TicketMessage = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl: string | null;
  isInternal: boolean;
  body: string;
  createdAt: string;
  attachments: Attachment[];
};

export type TicketStatusHistoryEntry = {
  id: string;
  fromStatusCode: TicketStatusCode | null;
  fromStatusName: string | null;
  toStatusCode: TicketStatusCode;
  toStatusName: string;
  changedBy: string;
  changedAt: string;
};

export type SubTask = {
  id: string;
  label: string;
  done: boolean;
};

export type Tag = {
  id: string;
  label: string;
};

export type LinkedTicketRef = {
  id: string;
  reference: string;
  title: string;
  statusCode: TicketStatusCode;
  statusName: string;
};

export type Ticket = {
  id: string;
  reference: string;
  title: string;
  description: string;
  statusId: string;
  status: TicketStatusCode;
  statusName: string;
  statusIsTerminal: boolean;
  priority: TicketPriority;
  typeId: string;
  type: TicketTypeCode;
  typeName: string;
  lot: string | null;
  trade: string | null;
  project: Project;
  assignees: Person[];
  reporter: Person;
  dueDate: string | null;
  createdAt: string;
  lastActivityAt: string;
  lastActivityPreview: string | null;
  lastActivityAuthor: string | null;
  tags: Tag[];
  watchersCount: number;
  messages: TicketMessage[];
  statusHistory: TicketStatusHistoryEntry[];
  subTasks: SubTask[];
  links: LinkedTicketRef[];
  customFields: Record<string, string>;
  attachments: Attachment[];
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
};
