'use client';

import { useRef, useState } from 'react';
import { RefreshCw, Upload, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { uploadProjectPlan } from '@/lib/plans-api';
import { mapPlan } from '@/lib/plan-mapper';
import type { Plan } from '@/types/plan';

const ALLOWED_PLAN_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PLAN_SIZE_BYTES = 20 * 1024 * 1024;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

type PlanUploadModalProps = {
  projectId: string;
  onClose: () => void;
  onUploaded: (plan: Plan) => void;
};

export function PlanUploadModal({ projectId, onClose, onUploaded }: PlanUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(file) && name.trim().length > 0 && !isSubmitting;

  function handleFileSelected(fileList: FileList | null) {
    const selected = fileList?.[0];
    if (!selected) return;
    setError(null);

    if (!ALLOWED_PLAN_MIME_TYPES.includes(selected.type)) {
      setError('Types acceptés : images (JPEG, PNG, WebP) ou PDF.');
      return;
    }
    if (selected.size > MAX_PLAN_SIZE_BYTES) {
      setError('Taille maximale : 20 Mo.');
      return;
    }

    setFile(selected);
    if (!name.trim()) {
      setName(selected.name.replace(/\.[^./]+$/, ''));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !file) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const apiPlan = await uploadProjectPlan(projectId, {
        file,
        name: name.trim(),
        discipline: discipline.trim() || undefined,
        version: version.trim() || undefined,
      });
      onUploaded(mapPlan(apiPlan));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d’envoyer ce plan.');
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
            <h2 className="text-lg font-semibold text-gray-900">Ajouter un plan</h2>
            <p className="mt-0.5 text-xs text-gray-400">Image ou PDF du plan de chantier</p>
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
            <FieldLabel>Fichier *</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => handleFileSelected(event.target.files)}
              className="hidden"
              id="plan-upload-file-input"
            />
            <label
              htmlFor="plan-upload-file-input"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              <Upload size={15} /> {file ? file.name : 'Choisir un fichier'}
            </label>
          </div>

          <div>
            <FieldLabel>Nom du plan *</FieldLabel>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex : Plan RDC"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Discipline</FieldLabel>
            <input
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
              placeholder="ex : Architecture, Électricité, VRD..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Version</FieldLabel>
            <input
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="ex : Indice C, Rev.2..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Même nom + discipline qu’un plan existant = nouvelle version du même plan.
            </p>
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
              Envoyer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
