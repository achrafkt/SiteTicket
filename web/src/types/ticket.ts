export type TicketStatusCode = 'todo' | 'in_progress' | 'done' | 'blocked' | 'waiting';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketTypeCode =
  | 'rfi'
  | 'reserve'
  | 'change_order'
  | 'qse_nonconformity'
  | 'intervention_request';

export type ReporterRole = 'MOA' | 'MOE' | 'Conducteur' | 'Sous-traitant' | 'Chef de chantier';

export type TicketTrade =
  | 'Gros œuvre'
  | 'Structure'
  | 'Électricité'
  | 'Plomberie'
  | 'Étanchéité'
  | 'VRD'
  | 'Second œuvre';

export type Attachment = {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  url: string;
  uploadedAt: string;
};

export type TicketMessage = {
  id: string;
  authorName: string;
  authorInitials: string;
  recipient: string;
  visibility: 'public' | 'private';
  body: string;
  createdAt: string;
  attachments: Attachment[];
};

export type TicketStatusHistoryEntry = {
  id: string;
  fromStatus: TicketStatusCode | null;
  toStatus: TicketStatusCode;
  changedBy: string;
  changedAt: string;
};

export type SubTask = {
  id: string;
  label: string;
  done: boolean;
};

export type Ticket = {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: TicketStatusCode;
  priority: TicketPriority;
  type: TicketTypeCode;
  lot: string;
  trade: TicketTrade | null;
  project: string;
  assignees: { name: string; initials: string }[];
  reporter: { name: string; role: ReporterRole };
  dueDate: string | null;
  createdAt: string;
  tags: string[];
  watchersCount: number;
  messages: TicketMessage[];
  statusHistory: TicketStatusHistoryEntry[];
  subTasks: SubTask[];
  linkedTicketIds: string[];
};

export const TICKET_STATUS_LABELS: Record<TicketStatusCode, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  blocked: 'Bloqué',
  waiting: 'En attente',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

export const TICKET_TYPE_LABELS: Record<TicketTypeCode, string> = {
  rfi: 'RFI',
  reserve: 'Réserve',
  change_order: 'Ordre de modification',
  qse_nonconformity: 'Non-conformité QSE',
  intervention_request: "Demande d'intervention",
};
