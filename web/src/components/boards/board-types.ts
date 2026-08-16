import type { TicketPriority } from '@/types/ticket';

export type BoardFilters = {
  projectId: string | null;
  assigneeId: string | null;
  priority: TicketPriority | null;
  blockingOnly: boolean;
};

export type BoardLayoutMode = 'columns' | 'swimlanes';

// Foundation for future saved/persisted board views (e.g. a board filtered to
// one chantier, or a swimlanes-by-chantier layout) — not wired to any UI or
// storage yet.
export type BoardView = {
  id: string;
  name: string;
  filters: BoardFilters;
  layoutMode: BoardLayoutMode;
  swimlaneBy?: 'project';
};

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  projectId: null,
  assigneeId: null,
  priority: null,
  blockingOnly: false,
};
