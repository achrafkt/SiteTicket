'use client';

import { Dropdown } from '@/components/tickets/Dropdown';
import type { PlanVersionGroup } from '@/types/plan';
import type { ProjectHub } from '@/types/project-hub';

type PlanSelectorProps = {
  projects: ProjectHub[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  groups: PlanVersionGroup[];
  selectedGroupKey: string;
  onGroupChange: (key: string) => void;
  selectedVersionId: string;
  onVersionChange: (id: string) => void;
};

export function PlanSelector({
  projects,
  selectedProjectId,
  onProjectChange,
  groups,
  selectedGroupKey,
  onGroupChange,
  selectedVersionId,
  onVersionChange,
}: PlanSelectorProps) {
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Chantier</p>
        <Dropdown
          value={selectedProjectId}
          onChange={onProjectChange}
          placeholder="Sélectionner un chantier"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
      </div>

      <div className="w-64">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</p>
        <Dropdown
          value={selectedGroupKey}
          onChange={onGroupChange}
          placeholder={groups.length === 0 ? 'Aucun plan pour ce chantier' : 'Sélectionner un plan'}
          disabled={groups.length === 0}
          options={groups.map((group) => ({
            value: group.key,
            label: group.name,
            description: group.discipline ?? undefined,
          }))}
        />
      </div>

      {selectedGroup && selectedGroup.versions.length > 1 ? (
        <div className="w-44">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Version</p>
          <Dropdown
            value={selectedVersionId}
            onChange={onVersionChange}
            options={selectedGroup.versions.map((version, index) => ({
              value: version.id,
              label: version.version ?? (index === 0 ? 'Dernière version' : `Version du ${new Date(version.uploadedAt).toLocaleDateString('fr-FR')}`),
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
