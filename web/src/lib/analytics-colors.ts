import type { TicketPriority, TicketStatusCode, TicketTypeCode } from '@/types/ticket';

// Status colors mirror the app's existing STATUS_DOT_CLASSES tokens
// (components/tickets/ticket-visuals.ts) so a status reads the same color
// here as it does on a ticket card or the Kanban board.
export const STATUS_CHART_COLORS: Record<TicketStatusCode, string> = {
  NEW: '#9ca3af',
  ASSIGNED: '#9ca3af',
  IN_PROGRESS: '#2563eb',
  PENDING: '#d97706',
  RESOLVED: '#15803d',
  CLOSED: '#15803d',
  REOPENED: '#dc2626',
};

// Priority is an ordinal severity scale, not an arbitrary category set, so it
// uses a fixed low→critical ramp rather than 4 unrelated categorical hues.
export const PRIORITY_CHART_COLORS: Record<TicketPriority, string> = {
  low: '#0ca30c',
  medium: '#fab219',
  high: '#ec835a',
  critical: '#d03b3b',
};

// Ticket type has no existing app-wide color convention, so this is a fresh
// 7-hue categorical assignment, fixed by type code (not by rank/count) so a
// type keeps its color across filters and across the two type-based charts.
export const TYPE_CHART_COLORS: Record<TicketTypeCode, string> = {
  RFI: '#2a78d6',
  SUBMITTAL: '#4a3aa7',
  CHANGE_ORDER: '#e87ba4',
  SAFETY: '#eb6834',
  PUNCH: '#1baf7a',
  MAINTENANCE: '#eda100',
  FIELD_ISSUE: '#008300',
};

export const VOLUME_SERIES_COLORS = {
  created: '#3b82f6',
  resolved: '#15803d',
} as const;

export const PROJECT_SERIES_COLORS = {
  open: '#2563eb',
  resolved: '#15803d',
} as const;

export const BUDGET_SERIES_COLORS = {
  planned: '#94a3b8',
  spent: '#2563eb',
} as const;

export const IMPACT_SERIES_COLORS = {
  cost: '#dc2626',
  schedule: '#d97706',
} as const;

export const NEUTRAL_SERIES_COLOR = '#3b82f6';
