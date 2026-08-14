'use client';

import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { ApiError } from '@/lib/api';
import {
  createAdminProject,
  PROJECT_STATUS_ICON_BG_CLASSES,
  PROJECT_STATUS_ICON_CLASSES,
  PROJECT_STATUS_ICONS,
  PROJECT_STATUS_LABELS,
  type ApiAdminProject,
  type ProjectStatusCode,
} from '@/lib/admin-api';
import { FieldLabel } from './FieldLabel';

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

type CreateProjectPanelProps = {
  onClose: () => void;
  onCreated: (project: ApiAdminProject) => void;
};

export function CreateProjectPanel({ onClose, onCreated }: CreateProjectPanelProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<ProjectStatusCode>('preparation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const project = await createAdminProject({
        name: name.trim(),
        code: generateProjectCode(name.trim()),
        address: address.trim() || undefined,
        status,
      });
      onCreated(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de créer le chantier.');
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
            <h2 className="text-lg font-semibold text-gray-900">Nouveau chantier</h2>
            <p className="mt-0.5 text-xs text-gray-400">Création réservée aux administrateurs</p>
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
            <FieldLabel>Adresse / description</FieldLabel>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={4}
              placeholder="Adresse du chantier ou description courte"
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
              Créer le chantier
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
