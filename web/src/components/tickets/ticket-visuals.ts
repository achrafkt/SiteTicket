import type { ElementType } from 'react';
import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  Minus,
  Circle,
  Check,
  Loader2,
  Clock,
  CheckCircle2,
  Lock,
  Undo2,
} from 'lucide-react';
import type { TicketPriority, TicketStatusCode } from '@/types/ticket';
import type { DueDateUrgency } from '@/lib/ticket-rules';

export const DUE_DATE_TEXT_CLASSES: Record<DueDateUrgency, string> = {
  overdue: 'font-medium text-red-600',
  soon: 'font-medium text-orange-600',
  normal: 'text-gray-700',
  none: 'text-gray-400',
};

export const STATUS_BADGE_CLASSES: Record<TicketStatusCode, string> = {
  NEW: 'bg-status-todo-bg text-status-todo',
  ASSIGNED: 'bg-status-todo-bg text-status-todo',
  IN_PROGRESS: 'bg-status-in-progress-bg text-status-in-progress',
  PENDING: 'bg-status-waiting-bg text-status-waiting',
  RESOLVED: 'bg-status-done-bg text-status-done',
  CLOSED: 'bg-status-done-bg text-status-done',
  REOPENED: 'bg-status-blocked-bg text-status-blocked',
};

export const STATUS_DOT_CLASSES: Record<TicketStatusCode, string> = {
  NEW: 'bg-status-todo',
  ASSIGNED: 'bg-status-todo',
  IN_PROGRESS: 'bg-status-in-progress',
  PENDING: 'bg-status-waiting',
  RESOLVED: 'bg-status-done',
  CLOSED: 'bg-status-done',
  REOPENED: 'bg-status-blocked',
};

export const STATUS_ICONS: Record<TicketStatusCode, ElementType> = {
  NEW: Circle,
  ASSIGNED: Check,
  IN_PROGRESS: Loader2,
  PENDING: Clock,
  RESOLVED: CheckCircle2,
  CLOSED: Lock,
  REOPENED: Undo2,
};

export const STATUS_ICON_CLASSES: Record<TicketStatusCode, string> = {
  NEW: 'text-status-todo',
  ASSIGNED: 'text-status-todo',
  IN_PROGRESS: 'text-status-in-progress',
  PENDING: 'text-status-waiting',
  RESOLVED: 'text-status-done',
  CLOSED: 'text-status-done',
  REOPENED: 'text-status-blocked',
};

export const STATUS_DESCRIPTIONS: Record<TicketStatusCode, string> = {
  NEW: 'Ticket créé, pas encore pris en charge.',
  ASSIGNED: 'Un responsable a été désigné, intervention à venir.',
  IN_PROGRESS: 'Le travail est en cours sur le terrain.',
  PENDING: "En attente d'une information, d'une validation ou d'un tiers.",
  RESOLVED: 'Problème traité, en attente de confirmation.',
  CLOSED: 'Clôturé, aucune action supplémentaire requise.',
  REOPENED: 'Rouvert après un retour ou un problème persistant.',
};

export const PRIORITY_ICONS: Record<TicketPriority, ElementType> = {
  critical: ChevronsUp,
  high: ChevronUp,
  medium: Minus,
  low: ChevronDown,
};

export const PRIORITY_ICON_CLASSES: Record<TicketPriority, string> = {
  critical: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-green-600',
};

export const PRIORITY_ICON_BG_CLASSES: Record<TicketPriority, string> = {
  critical: 'bg-red-50',
  high: 'bg-orange-50',
  medium: 'bg-amber-50',
  low: 'bg-green-50',
};

export const REPORTER_ROLE_BADGE_CLASSES: Record<string, string> = {
  moa: 'bg-purple-100 text-purple-700',
  moe: 'bg-indigo-100 text-indigo-700',
  conducteur_travaux: 'bg-blue-100 text-blue-700',
  sous_traitant: 'bg-amber-100 text-amber-700',
  chef_chantier: 'bg-teal-100 text-teal-700',
  qse: 'bg-rose-100 text-rose-700',
  observateur: 'bg-slate-100 text-slate-600',
  admin: 'bg-slate-100 text-slate-600',
};

export function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function initialsAvatarColor(initials: string): string {
  const palette = [
    'bg-blue-600',
    'bg-teal-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-emerald-600',
  ];
  const index = initials.charCodeAt(0) % palette.length;
  return palette[index];
}
