'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { CreateProjectPanel } from '@/components/settings/CreateProjectPanel';
import { ApiError } from '@/lib/api';
import {
  getAdminProjects,
  PROJECT_STATUS_LABELS,
  updateAdminProject,
  type ApiAdminProject,
  type ProjectStatusCode,
} from '@/lib/admin-api';

const STATUS_DOT_CLASSES: Record<ProjectStatusCode, string> = {
  preparation: 'bg-amber-500',
  actif: 'bg-emerald-500',
  suspendu: 'bg-orange-500',
  termine: 'bg-slate-400',
  archive: 'bg-gray-400',
};

export default function ProjectsSettingsPage() {
  const [projects, setProjects] = useState<ApiAdminProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPanelOpen, setPanelOpen] = useState(false);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getAdminProjects();
      setProjects(data);
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

  async function handleStatusChange(projectId: string, status: ProjectStatusCode) {
    const previous = projects;
    setRowError(null);
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, status } : project)),
    );

    try {
      await updateAdminProject(projectId, { status });
    } catch (err) {
      setProjects(previous);
      setRowError(err instanceof ApiError ? err.message : 'Impossible de modifier le statut.');
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Chantiers</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez les projets / chantiers de la plateforme.</p>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={15} /> Nouveau chantier
        </button>
      </header>

      {rowError ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{rowError}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Adresse / description</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{project.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                    {project.address ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Dropdown
                      value={project.status}
                      onChange={(value) => handleStatusChange(project.id, value as ProjectStatusCode)}
                      options={(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatusCode[]).map(
                        (code) => ({
                          value: code,
                          label: PROJECT_STATUS_LABELS[code],
                          dotClassName: STATUS_DOT_CLASSES[code],
                        }),
                      )}
                      className="max-w-50"
                    />
                  </td>
                </tr>
              ))}
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucun chantier.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {isPanelOpen ? (
        <CreateProjectPanel
          onClose={() => setPanelOpen(false)}
          onCreated={(project) => {
            setProjects((current) => [project, ...current]);
            setPanelOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
