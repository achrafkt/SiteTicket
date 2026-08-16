'use client';

import { ShieldAlert } from 'lucide-react';
import type { Person, Project, TicketPriority } from '@/types/ticket';
import { TICKET_PRIORITY_LABELS } from '@/types/ticket';
import { Dropdown } from '@/components/tickets/Dropdown';
import { PRIORITY_ICONS, PRIORITY_ICON_CLASSES } from '@/components/tickets/ticket-visuals';
import { EMPTY_BOARD_FILTERS, type BoardFilters } from './board-types';

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

      <button
        type="button"
        onClick={() => onChange({ ...filters, blockingOnly: !filters.blockingOnly })}
        aria-pressed={filters.blockingOnly}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          filters.blockingOnly
            ? 'border-red-200 bg-red-100 text-red-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <ShieldAlert size={13} /> Bloquants uniquement
      </button>

      {filters.projectId || filters.assigneeId || filters.priority || filters.blockingOnly ? (
        <button
          type="button"
          onClick={() => onChange(EMPTY_BOARD_FILTERS)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Réinitialiser
        </button>
      ) : null}
    </div>
  );
}
