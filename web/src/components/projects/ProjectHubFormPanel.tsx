'use client';

import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { FieldLabel } from '@/components/settings/FieldLabel';
import { ApiError } from '@/lib/api';
import {
  PROJECT_STATUS_ICON_BG_CLASSES,
  PROJECT_STATUS_ICON_CLASSES,
  PROJECT_STATUS_ICONS,
  PROJECT_STATUS_LABELS,
  type ProjectStatusCode,
} from '@/lib/admin-api';
import { createProjectHub, updateProjectHub } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import type { ProjectHub } from '@/types/project-hub';

const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g');

function generateProjectCode(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug || 'CHANTIER'}-${suffix}`;
}

function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  return isoDate.slice(0, 10);
}

type ProjectHubFormPanelProps = {
  project: ProjectHub | null;
  onClose: () => void;
  onSaved: (project: ProjectHub) => void;
};

export function ProjectHubFormPanel({ project, onClose, onSaved }: ProjectHubFormPanelProps) {
  const isEditing = project !== null;
  const [name, setName] = useState(project?.name ?? '');
  const [address, setAddress] = useState(project?.address ?? '');
  const [clientName, setClientName] = useState(project?.clientName ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatusCode>(project?.status ?? 'preparation');
  const [budgetPlanned, setBudgetPlanned] = useState(
    project?.budgetPlanned !== null && project?.budgetPlanned !== undefined
      ? String(project.budgetPlanned)
      : '',
  );
  const [startDate, setStartDate] = useState(toDateInputValue(project?.startDate));
  const [endDatePlanned, setEndDatePlanned] = useState(toDateInputValue(project?.endDatePlanned));
  const [endDateActual, setEndDateActual] = useState(toDateInputValue(project?.endDateActual));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      address: address.trim() || undefined,
      clientName: clientName.trim() || undefined,
      description: description.trim() || undefined,
      status,
      budgetPlanned: budgetPlanned.trim() ? Number(budgetPlanned) : undefined,
      startDate: startDate || undefined,
      endDatePlanned: endDatePlanned || undefined,
      endDateActual: endDateActual || undefined,
    };

    try {
      const saved = isEditing
        ? await updateProjectHub(project.id, payload)
        : await createProjectHub({ ...payload, code: generateProjectCode(name.trim()) });
      onSaved(mapProjectHub(saved));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d’enregistrer le chantier.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <section
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Modifier le chantier' : 'Nouveau chantier'}
            </h2>
            {isEditing ? <p className="mt-0.5 text-xs text-gray-400">{project.code}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel>Nom du chantier *</FieldLabel>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex : Résidence Les Terrasses"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Adresse</FieldLabel>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Adresse du chantier"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Client / Maître d’ouvrage</FieldLabel>
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nom du client"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Description courte du chantier"
              className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Statut</FieldLabel>
            <Dropdown
              value={status}
              onChange={(value) => setStatus(value as ProjectStatusCode)}
              options={(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatusCode[]).map((code) => ({
                value: code,
                label: PROJECT_STATUS_LABELS[code],
                icon: PROJECT_STATUS_ICONS[code],
                iconClassName: PROJECT_STATUS_ICON_CLASSES[code],
                iconBgClassName: PROJECT_STATUS_ICON_BG_CLASSES[code],
              }))}
            />
          </div>

          <div>
            <FieldLabel>Budget prévisionnel (MAD)</FieldLabel>
            <input
              type="number"
              min={0}
              value={budgetPlanned}
              onChange={(event) => setBudgetPlanned(event.target.value)}
              placeholder="ex : 2450000"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Date de début</FieldLabel>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div>
              <FieldLabel>Fin prévisionnelle</FieldLabel>
              <input
                type="date"
                value={endDatePlanned}
                onChange={(event) => setEndDatePlanned(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Fin réelle</FieldLabel>
            <input
              type="date"
              value={endDateActual}
              onChange={(event) => setEndDateActual(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          {error ? (
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
              {isEditing ? 'Enregistrer' : 'Créer le chantier'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
