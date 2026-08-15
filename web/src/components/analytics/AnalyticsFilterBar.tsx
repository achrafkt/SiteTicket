'use client';

import { Dropdown } from '@/components/tickets/Dropdown';
import type { AnalyticsProjectRef, DateRangePreset } from '@/types/analytics';
import { DATE_RANGE_PRESET_LABELS } from '@/types/analytics';
import type { TicketType } from '@/types/ticket';

type AnalyticsFilterBarProps = {
  projects: AnalyticsProjectRef[];
  ticketTypes: TicketType[];
  projectId: string | null;
  onProjectChange: (value: string | null) => void;
  datePreset: DateRangePreset;
  onDatePresetChange: (value: DateRangePreset) => void;
  ticketTypeId: string | null;
  onTicketTypeChange: (value: string | null) => void;
};

const DATE_PRESET_OPTIONS = (Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[]).map((preset) => ({
  value: preset,
  label: DATE_RANGE_PRESET_LABELS[preset],
}));

export function AnalyticsFilterBar({
  projects,
  ticketTypes,
  projectId,
  onProjectChange,
  datePreset,
  onDatePresetChange,
  ticketTypeId,
  onTicketTypeChange,
}: AnalyticsFilterBarProps) {
  const hasActiveFilters = Boolean(projectId) || Boolean(ticketTypeId) || datePreset !== '90d';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Dropdown
        value={projectId ?? ''}
        onChange={(value) => onProjectChange(value || null)}
        className="w-52"
        placeholder="Tous les chantiers"
        options={[
          { value: '', label: 'Tous les chantiers' },
          ...projects.map((project) => ({ value: project.id, label: project.name })),
        ]}
      />

      <Dropdown
        value={datePreset}
        onChange={(value) => onDatePresetChange(value as DateRangePreset)}
        className="w-44"
        options={DATE_PRESET_OPTIONS}
      />

      <Dropdown
        value={ticketTypeId ?? ''}
        onChange={(value) => onTicketTypeChange(value || null)}
        className="w-52"
        placeholder="Tous les types"
        options={[
          { value: '', label: 'Tous les types' },
          ...ticketTypes.map((type) => ({ value: type.id, label: type.name })),
        ]}
      />

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={() => {
            onProjectChange(null);
            onTicketTypeChange(null);
            onDatePresetChange('90d');
          }}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Réinitialiser
        </button>
      ) : null}
    </div>
  );
}
