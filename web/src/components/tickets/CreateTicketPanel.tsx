'use client';

import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { Dropdown } from './Dropdown';
import { PRIORITY_DOT_CLASSES } from './ticket-visuals';
import { TICKET_PRIORITY_LABELS, type TicketPriority } from '@/types/ticket';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

export function CreateTicketPanel() {
  const types = useTicketStore((state) => state.types);
  const projects = useTicketStore((state) => state.projects);
  const currentUser = useTicketStore((state) => state.currentUser);
  const createDraftTypeId = useTicketStore((state) => state.createDraftTypeId);
  const isCreatingTicket = useTicketStore((state) => state.isCreatingTicket);
  const createTicketError = useTicketStore((state) => state.createTicketError);
  const closeCreateTicketPanel = useTicketStore((state) => state.closeCreateTicketPanel);
  const createTicket = useTicketStore((state) => state.createTicket);

  const type = types.find((candidate) => candidate.id === createDraftTypeId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [locationZone, setLocationZone] = useState('');
  const [trade, setTrade] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);

  const canSubmit = title.trim().length > 0 && projectId.length > 0 && !isCreatingTicket;

  async function handleSubmit() {
    if (!canSubmit) return;

    await createTicket({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId,
      priority,
      locationZone: locationZone.trim() || undefined,
      trade: trade.trim() || undefined,
      dueDate: dueDate || undefined,
      assignedTo: assignToMe ? currentUser?.id : undefined,
    });
  }

  return (
    <section className="flex h-full min-w-[420px] flex-1 flex-col bg-gray-50">
      <header className="flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">Nouveau ticket</h1>
          <p className="mt-0.5 text-xs text-gray-400">{type?.name ?? 'Type inconnu'}</p>
        </div>
        <button
          type="button"
          onClick={closeCreateTicketPanel}
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </header>

      <div className="helpdesk-scroll flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div>
          <FieldLabel>Titre *</FieldLabel>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Résumé court du ticket"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Détails, contexte, localisation précise..."
            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div>
          <FieldLabel>Chantier / Projet *</FieldLabel>
          <Dropdown
            value={projectId}
            onChange={setProjectId}
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
          />
        </div>

        <div>
          <FieldLabel>Priorité</FieldLabel>
          <Dropdown
            value={priority}
            onChange={(value) => setPriority(value as TicketPriority)}
            options={(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((code) => ({
              value: code,
              label: TICKET_PRIORITY_LABELS[code],
              dotClassName: PRIORITY_DOT_CLASSES[code],
            }))}
          />
        </div>

        <div>
          <FieldLabel>Zone / Lot</FieldLabel>
          <input
            value={locationZone}
            onChange={(event) => setLocationZone(event.target.value)}
            placeholder="ex : LOT-216"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div>
          <FieldLabel>Corps de métier concerné</FieldLabel>
          <input
            value={trade}
            onChange={(event) => setTrade(event.target.value)}
            placeholder="ex : Électricité"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div>
          <FieldLabel>Date d&apos;échéance</FieldLabel>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={assignToMe}
            onChange={(event) => setAssignToMe(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300"
          />
          M&apos;assigner ce ticket
        </label>
      </div>

      <div className="border-t border-gray-100 bg-white px-5 py-3">
        {createTicketError ? (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{createTicketError}</p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeCreateTicketPanel}
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
            {isCreatingTicket ? <RefreshCw size={14} className="animate-spin" /> : null}
            Créer le ticket
          </button>
        </div>
      </div>
    </section>
  );
}
