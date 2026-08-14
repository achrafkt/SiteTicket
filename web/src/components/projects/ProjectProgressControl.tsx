'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { updateProjectHubProgress } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import { ProjectProgressBar } from './ProjectProgressBar';
import type { ProjectHub } from '@/types/project-hub';

type ProjectProgressControlProps = {
  project: ProjectHub;
  canEdit: boolean;
  onUpdated: (project: ProjectHub) => void;
};

export function ProjectProgressControl({ project, canEdit, onUpdated }: ProjectProgressControlProps) {
  const [value, setValue] = useState(project.progressPercent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = value !== project.progressPercent;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateProjectHubProgress(project.id, value);
      onUpdated(mapProjectHub(updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour l'avancement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!canEdit) {
    return <ProjectProgressBar percent={project.progressPercent} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-blue-600"
        />
        <span className="w-10 shrink-0 text-right text-sm font-medium text-gray-700">{value}%</span>
      </div>
      {isDirty ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
          Mettre à jour l&apos;avancement
        </button>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
