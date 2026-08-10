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

export const PRIORITY_DOT_CLASSES: Record<TicketPriority, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  critical: 'bg-priority-urgent',
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
