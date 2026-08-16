'use client';

import { useRef, useState } from 'react';
import { Paperclip, RefreshCw, X } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/tickets-api';
import { AttachmentThumb } from './AttachmentThumb';
import { Dropdown } from './Dropdown';
import { PRIORITY_ICONS, PRIORITY_ICON_CLASSES } from './ticket-visuals';
import { TICKET_PRIORITY_LABELS, type TicketPriority } from '@/types/ticket';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

export function CreateTicketPanel() {
  const types = useTicketStore((state) => state.types);
  const projects = useTicketStore((state) => state.projects);
  const users = useTicketStore((state) => state.users);
  const currentUser = useTicketStore((state) => state.currentUser);
  const createDraftTypeId = useTicketStore((state) => state.createDraftTypeId);
  const isCreatingTicket = useTicketStore((state) => state.isCreatingTicket);
  const createTicketError = useTicketStore((state) => state.createTicketError);
  const closeCreateTicketPanel = useTicketStore((state) => state.closeCreateTicketPanel);
  const createTicket = useTicketStore((state) => state.createTicket);
  const uploadTicketAttachment = useTicketStore((state) => state.uploadTicketAttachment);

  const type = types.find((candidate) => candidate.id === createDraftTypeId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [locationZone, setLocationZone] = useState('');
  const [trade, setTrade] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [externalParty, setExternalParty] = useState('');
  const [costImpactAmount, setCostImpactAmount] = useState('');
  const [scheduleImpactDays, setScheduleImpactDays] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = title.trim().length > 0 && projectId.length > 0 && !isCreatingTicket && !isUploadingFiles;

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setFileError(null);

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        setFileError('Types acceptés : images (JPEG, PNG, WebP) ou PDF.');
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setFileError('Taille maximale : 10 Mo par fichier.');
        continue;
      }
      accepted.push(file);
    }

    setPendingFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    const ticket = await createTicket({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId,
      priority,
      locationZone: locationZone.trim() || undefined,
      trade: trade.trim() || undefined,
      dueDate: dueDate || undefined,
      isBlocking: isBlocking || undefined,
      externalParty: externalParty.trim() || undefined,
      costImpactAmount: costImpactAmount ? Number(costImpactAmount) : undefined,
      scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : undefined,
      assignedTo: assignedUserId || undefined,
    });

    if (ticket && pendingFiles.length > 0) {
      setIsUploadingFiles(true);
      for (const file of pendingFiles) {
        await uploadTicketAttachment(ticket.id, file);
      }
      setIsUploadingFiles(false);
    }
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
              icon: PRIORITY_ICONS[code],
              iconClassName: PRIORITY_ICON_CLASSES[code],
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

        <div className="flex items-center gap-2">
          <input
            id="create-ticket-is-blocking"
            type="checkbox"
            checked={isBlocking}
            onChange={(event) => setIsBlocking(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-200"
          />
          <label htmlFor="create-ticket-is-blocking" className="text-sm font-medium text-gray-700">
            Ticket bloquant
          </label>
        </div>

        <div>
          <FieldLabel>Partie externe concernée</FieldLabel>
          <input
            value={externalParty}
            onChange={(event) => setExternalParty(event.target.value)}
            placeholder="ex : Sous-traitant XYZ"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Impact coût (MAD)</FieldLabel>
            <input
              type="number"
              value={costImpactAmount}
              onChange={(event) => setCostImpactAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div>
            <FieldLabel>Impact délai (jours)</FieldLabel>
            <input
              type="number"
              value={scheduleImpactDays}
              onChange={(event) => setScheduleImpactDays(event.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <FieldLabel>Assigné à</FieldLabel>
            {currentUser && assignedUserId !== currentUser.id ? (
              <button
                type="button"
                onClick={() => setAssignedUserId(currentUser.id)}
                className="mb-1.5 shrink-0 whitespace-nowrap text-[11px] font-medium text-blue-600 hover:underline"
              >
                M&apos;assigner ce ticket
              </button>
            ) : null}
          </div>
          <Dropdown
            value={assignedUserId}
            onChange={setAssignedUserId}
            options={[
              { value: '', label: 'Non assigné' },
              ...users.map((user) => ({
                value: user.id,
                label: user.id === currentUser?.id ? `${user.name} (moi)` : user.name,
                initials: user.initials,
              })),
            ]}
          />
        </div>

        <div>
          <FieldLabel>Photos / documents</FieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => handleFilesSelected(event.target.files)}
            className="hidden"
            id="create-ticket-file-input"
          />
          <label
            htmlFor="create-ticket-file-input"
            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            <Paperclip size={13} /> Joindre un fichier
          </label>
          {fileError ? <p className="mt-1.5 text-xs text-red-600">{fileError}</p> : null}
          {pendingFiles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingFiles.map((file, index) => (
                <AttachmentThumb
                  key={`${file.name}-${index}`}
                  fileName={file.name}
                  fileType={file.type}
                  fileSize={file.size}
                  onRemove={() => removePendingFile(index)}
                  disabled={isUploadingFiles}
                />
              ))}
            </div>
          ) : null}
        </div>
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
            {isCreatingTicket || isUploadingFiles ? <RefreshCw size={14} className="animate-spin" /> : null}
            {isUploadingFiles ? 'Envoi des pièces jointes...' : 'Créer le ticket'}
          </button>
        </div>
      </div>
    </section>
  );
}
