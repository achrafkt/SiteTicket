'use client';

import { useRouter } from 'next/navigation';
import { MapPin, ListChecks } from 'lucide-react';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectProgressBar } from './ProjectProgressBar';
import { formatCurrency, formatProjectDate } from '@/lib/project-hub-format';
import type { ProjectHub } from '@/types/project-hub';

export function ProjectCard({ project }: { project: ProjectHub }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/projects/${project.id}`)}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
          <p className="mt-0.5 text-xs text-gray-400">{project.code}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.address ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{project.address}</span>
        </div>
      ) : null}

      <ProjectProgressBar percent={project.progressPercent} />

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <ListChecks size={13} className="shrink-0" />
          <span>{project.taskCount} tâche{project.taskCount > 1 ? 's' : ''}</span>
        </div>
        {project.budgetPlanned !== null ? (
          <span className="font-medium text-gray-700">{formatCurrency(project.budgetPlanned)}</span>
        ) : null}
      </div>

      {project.endDatePlanned ? (
        <p className="text-[11px] text-gray-400">
          Fin prévisionnelle : {formatProjectDate(project.endDatePlanned)}
        </p>
      ) : null}
    </button>
  );
}
