'use client';

import type { Person, Project, TicketPriority } from '@/types/ticket';
import { TICKET_PRIORITY_LABELS } from '@/types/ticket';
import { Dropdown } from '@/components/tickets/Dropdown';
import { PRIORITY_ICONS, PRIORITY_ICON_CLASSES } from '@/components/tickets/ticket-visuals';
import type { BoardFilters } from './board-types';

type BoardFilterBarProps = {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  projects: Project[];
  users: Person[];
};

export function BoardFilterBar({ filters, onChange, projects, users }: BoardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Dropdown
        value={filters.projectId ?? ''}
        onChange={(value) => onChange({ ...filters, projectId: value || null })}
        className="w-48"
        placeholder="Tous les chantiers"
        options={[
          { value: '', label: 'Tous les chantiers' },
          ...projects.map((project) => ({ value: project.id, label: project.name })),
        ]}
      />

      <Dropdown
        value={filters.assigneeId ?? ''}
        onChange={(value) => onChange({ ...filters, assigneeId: value || null })}
        className="w-48"
        placeholder="Tous les assignés"
        options={[
          { value: '', label: 'Tous les assignés' },
          ...users.map((user) => ({ value: user.id, label: user.name, initials: user.initials, avatarUrl: user.avatarUrl })),
        ]}
      />

      <Dropdown
        value={filters.priority ?? ''}
        onChange={(value) => onChange({ ...filters, priority: (value || null) as TicketPriority | null })}
        className="w-44"
        placeholder="Toutes les priorités"
        options={[
          { value: '', label: 'Toutes les priorités' },
          ...(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((code) => ({
            value: code,
            label: TICKET_PRIORITY_LABELS[code],
            icon: PRIORITY_ICONS[code],
            iconClassName: PRIORITY_ICON_CLASSES[code],
          })),
        ]}
      />

      {filters.projectId || filters.assigneeId || filters.priority ? (
        <button
          type="button"
          onClick={() => onChange({ projectId: null, assigneeId: null, priority: null })}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Réinitialiser
        </button>
      ) : null}
    </div>
  );
}
