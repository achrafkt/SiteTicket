'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ApiError } from '@/lib/api';
import { getProjectHub } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import { formatProjectDate } from '@/lib/project-hub-format';
import {
  canManageProjectBudget,
  canManageProjectField,
  canManageProjectInfo,
  canViewProjectBudget,
} from '@/lib/project-hub-permissions';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectProgressControl } from '@/components/projects/ProjectProgressControl';
import { ProjectTasksPanel } from '@/components/projects/ProjectTasksPanel';
import { ProjectBudgetPanel } from '@/components/projects/ProjectBudgetPanel';
import { ProjectHubFormPanel } from '@/components/projects/ProjectHubFormPanel';
import type { ProjectHub } from '@/types/project-hub';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export default function ProjectHubDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useTicketStore((state) => state.currentUser);

  const canEditInfo = canManageProjectInfo(currentUser);
  const canEditField = canManageProjectField(currentUser);
  const canSeeBudget = canViewProjectBudget(currentUser);
  const canEditBudget = canManageProjectBudget(currentUser);

  const [project, setProject] = useState<ProjectHub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditPanelOpen, setEditPanelOpen] = useState(false);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getProjectHub(params.id);
      setProject(mapProjectHub(data));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger ce chantier.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin" /> Chargement...
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-500">
        <p className="text-red-600">{loadError ?? 'Chantier introuvable.'}</p>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retour aux chantiers
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <button
        type="button"
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Tous les chantiers
      </button>

      <header className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-xs text-gray-400">{project.code}</p>
          {project.address ? <p className="mt-2 text-sm text-gray-600">{project.address}</p> : null}
        </div>
        {canEditInfo ? (
          <button
            type="button"
            onClick={() => setEditPanelOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Pencil size={13} /> Modifier
          </button>
        ) : null}
      </header>

      <SectionCard title="Avancement">
        <ProjectProgressControl
          project={project}
          canEdit={canEditField}
          onUpdated={(updated) => setProject({ ...updated, tasks: project.tasks, expenses: project.expenses })}
        />
      </SectionCard>

      <SectionCard title="Informations">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Client / Maître d’ouvrage</dt>
            <dd className="mt-0.5 text-gray-700">{project.clientName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Description</dt>
            <dd className="mt-0.5 text-gray-700">{project.description ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Date de début</dt>
            <dd className="mt-0.5 text-gray-700">{formatProjectDate(project.startDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Fin prévisionnelle</dt>
            <dd className="mt-0.5 text-gray-700">{formatProjectDate(project.endDatePlanned)}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Tâches">
        <ProjectTasksPanel
          projectId={project.id}
          tasks={project.tasks ?? []}
          canEdit={canEditField}
          onChange={(tasks) => setProject({ ...project, tasks, taskCount: tasks.length })}
        />
      </SectionCard>

      {canSeeBudget ? (
        <SectionCard title="Budget">
          <ProjectBudgetPanel
            projectId={project.id}
            budgetPlanned={project.budgetPlanned}
            expenses={project.expenses ?? []}
            canEdit={canEditBudget}
            onChange={(expenses) => setProject({ ...project, expenses })}
          />
        </SectionCard>
      ) : null}

      {isEditPanelOpen ? (
        <ProjectHubFormPanel
          project={project}
          onClose={() => setEditPanelOpen(false)}
          onSaved={(updated) => {
            setProject({ ...updated, tasks: project.tasks, expenses: project.expenses });
            setEditPanelOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
