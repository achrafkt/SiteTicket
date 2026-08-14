'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ApiError } from '@/lib/api';
import { getProjectHubs } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import { canManageProjectInfo } from '@/lib/project-hub-permissions';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectHubFormPanel } from '@/components/projects/ProjectHubFormPanel';
import type { ProjectHub } from '@/types/project-hub';

export default function ProjectsPage() {
  const currentUser = useTicketStore((state) => state.currentUser);
  const canCreate = canManageProjectInfo(currentUser);

  const [projects, setProjects] = useState<ProjectHub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPanelOpen, setPanelOpen] = useState(false);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getProjectHubs();
      setProjects(data.map(mapProjectHub));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les chantiers.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projets / Chantiers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Suivi opérationnel des chantiers : avancement, tâches et budget.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={15} /> Nouveau chantier
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <RefreshCw size={16} className="animate-spin" /> Chargement...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-500">
          <p className="text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          <p>Aucun chantier pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {isPanelOpen ? (
        <ProjectHubFormPanel
          project={null}
          onClose={() => setPanelOpen(false)}
          onSaved={(project) => {
            setProjects((current) => [project, ...current]);
            setPanelOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
