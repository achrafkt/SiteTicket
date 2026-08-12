'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, RefreshCw, X } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { getDueDateUrgency } from '@/lib/ticket-rules';
import { canDeleteAttachment, getTicketPermissionGuard } from '@/lib/ticket-permissions';
import { Avatar } from './Avatar';
import { AttachmentThumb } from './AttachmentThumb';
import { Dropdown } from './Dropdown';
import {
  DUE_DATE_TEXT_CLASSES,
  PRIORITY_ICONS,
  PRIORITY_ICON_CLASSES,
  PRIORITY_ICON_BG_CLASSES,
  REPORTER_ROLE_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_ICONS,
  STATUS_ICON_CLASSES,
  STATUS_DESCRIPTIONS,
  formatShortDate,
} from './ticket-visuals';
import { TICKET_PRIORITY_LABELS, type Ticket, type TicketPriority } from '@/types/ticket';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-100 py-3.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {typeof count === 'number' ? (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{count}</span>
          ) : null}
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function TicketDetailsPanel({ ticket }: { ticket: Ticket }) {
  const statuses = useTicketStore((state) => state.statuses);
  const users = useTicketStore((state) => state.users);
  const currentUser = useTicketStore((state) => state.currentUser);
  const updateTicketStatus = useTicketStore((state) => state.updateTicketStatus);
  const updateTicketPriority = useTicketStore((state) => state.updateTicketPriority);
  const assignTicketToUser = useTicketStore((state) => state.assignTicketToUser);
  const deleteTicketAttachment = useTicketStore((state) => state.deleteTicketAttachment);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const detailLoadingId = useTicketStore((state) => state.detailLoadingId);
  const detailError = useTicketStore((state) => state.detailError);
  const ticketActionError = useTicketStore((state) => state.ticketActionError);
  const [tagDraft, setTagDraft] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tags, setTags] = useState(ticket.tags);

  const isDetailLoading = detailLoadingId === ticket.id;
  const isAssignedToMe = ticket.assignees.some((assignee) => assignee.id === currentUser?.id);
  const permissionGuard = getTicketPermissionGuard(currentUser, ticket);
  const canSelfAssign = Boolean(currentUser) && users.some((user) => user.id === currentUser?.id);

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    if (!tags.includes(value)) {
      setTags((current) => [...current, value]);
    }
    setTagDraft('');
    setIsAddingTag(false);
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((existing) => existing !== tag));
  }

  return (
    <aside className="helpdesk-scroll flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 p-4">
        <Dropdown
          className="min-w-0 flex-1"
          value={ticket.statusId}
          onChange={(newStatusId) => updateTicketStatus(ticket.id, newStatusId)}
          options={statuses.map((status) => ({
            value: status.id,
            label: status.name,
            description: STATUS_DESCRIPTIONS[status.code as keyof typeof STATUS_DESCRIPTIONS],
            icon: STATUS_ICONS[status.code as keyof typeof STATUS_ICONS],
            iconClassName: STATUS_ICON_CLASSES[status.code as keyof typeof STATUS_ICON_CLASSES],
          }))}
          disabled={!permissionGuard.canModify}
          title={permissionGuard.modifyReason}
        />
        <button
          type="button"
          onClick={() => toggleDetailsPanel(false)}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {ticketActionError ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{ticketActionError}</p>
      ) : null}

      <div className="space-y-6 p-4">
        <div>
          <FieldLabel>Priorité</FieldLabel>
          <Dropdown
            value={ticket.priority}
            onChange={(newPriority) => updateTicketPriority(ticket.id, newPriority as TicketPriority)}
            options={(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((code) => ({
              value: code,
              label: TICKET_PRIORITY_LABELS[code],
              icon: PRIORITY_ICONS[code],
              iconClassName: PRIORITY_ICON_CLASSES[code],
              iconBgClassName: PRIORITY_ICON_BG_CLASSES[code],
            }))}
            disabled={!permissionGuard.canModify}
            title={permissionGuard.modifyReason}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Assigné à</p>
            {canSelfAssign && !isAssignedToMe ? (
              <button
                type="button"
                onClick={() => assignTicketToUser(ticket.id, currentUser!.id)}
                disabled={!permissionGuard.canAssign}
                title={permissionGuard.assignReason}
                className={`shrink-0 whitespace-nowrap text-[11px] font-medium ${
                  permissionGuard.canAssign
                    ? 'text-blue-600 hover:underline'
                    : 'cursor-not-allowed text-gray-300'
                }`}
              >
                Assigner à moi
              </button>
            ) : null}
          </div>
          <Dropdown
            value={ticket.assignees[0]?.id ?? ''}
            onChange={(userId) => assignTicketToUser(ticket.id, userId || null)}
            placeholder="Non assigné"
            options={[
              { value: '', label: 'Non assigné' },
              ...users.map((user) => ({
                value: user.id,
                label: user.id === currentUser?.id ? `${user.name} (moi)` : user.name,
                initials: user.initials,
                avatarUrl: user.avatarUrl,
              })),
            ]}
            disabled={!permissionGuard.canAssign}
            title={permissionGuard.assignReason}
          />
        </div>

        <div>
          <FieldLabel>Chantier / Projet</FieldLabel>
          <p className="text-sm text-gray-700">{ticket.project.name}</p>
        </div>

        <div>
          <FieldLabel>Type de ticket</FieldLabel>
          <p className="text-sm text-gray-700">{ticket.typeName}</p>
        </div>

        <div>
          <FieldLabel>Date d&apos;échéance</FieldLabel>
          <p
            className={`text-sm ${
              DUE_DATE_TEXT_CLASSES[getDueDateUrgency(ticket.dueDate, ticket.statusIsTerminal)]
            }`}
          >
            {formatShortDate(ticket.dueDate)}
          </p>
        </div>

        <div>
          <FieldLabel>Rapporteur</FieldLabel>
          <div className="flex items-center gap-2">
            <Avatar initials={ticket.reporter.initials} avatarUrl={ticket.reporter.avatarUrl} />
            <span className="text-sm text-gray-700">{ticket.reporter.name}</span>
            {ticket.reporter.roleName ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  REPORTER_ROLE_BADGE_CLASSES[ticket.reporter.roleCode ?? ''] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {ticket.reporter.roleName}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <FieldLabel>Corps de métier concerné</FieldLabel>
          <p className="text-sm text-gray-700">{ticket.trade ?? 'Non renseigné'}</p>
        </div>

        <div>
          <FieldLabel>Tags</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="group flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-xs text-gray-600"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  title={`Supprimer ${tag}`}
                  className="rounded-full p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <input
                autoFocus
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onBlur={() => (tagDraft.trim() ? addTag() : setIsAddingTag(false))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                  if (event.key === 'Escape') {
                    setTagDraft('');
                    setIsAddingTag(false);
                  }
                }}
                placeholder="Nom du tag"
                className="w-24 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                <Plus size={11} /> Ajouter un tag
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <CollapsibleSection title="Tâches" count={ticket.subTasks.length}>
          <div className="space-y-1.5">
            {ticket.subTasks.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune sous-tâche.</p>
            ) : (
              ticket.subTasks.map((task) => (
                <label key={task.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" defaultChecked={task.done} className="h-3.5 w-3.5 rounded border-gray-300" />
                  {task.label}
                </label>
              ))
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Champs collectés">
          <p className="text-xs text-gray-400">Aucun champ personnalisé pour ce type de ticket.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Tickets liés" count={ticket.linkedTicketIds.length}>
          {ticket.linkedTicketIds.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun ticket lié.</p>
          ) : (
            <ul className="space-y-1 text-sm text-blue-600">
              {ticket.linkedTicketIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Pièces jointes" count={ticket.attachments.length}>
          {ticket.attachments.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune pièce jointe.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((attachment) => {
                const canRemove = canDeleteAttachment(currentUser, attachment.uploadedBy.id);
                return (
                  <AttachmentThumb
                    key={attachment.id}
                    fileName={attachment.fileName}
                    fileType={attachment.fileType}
                    fileSize={attachment.fileSize}
                    fileUrl={attachment.fileUrl}
                    onRemove={() => deleteTicketAttachment(ticket.id, attachment.id)}
                    disabled={!canRemove}
                    disabledReason={
                      canRemove ? undefined : 'Votre rôle ne permet pas de supprimer cette pièce jointe.'
                    }
                  />
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Historique" count={ticket.statusHistory.length}>
          {isDetailLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw size={12} className="animate-spin" /> Chargement de l&apos;historique...
            </p>
          ) : detailError ? (
            <p className="text-xs text-red-600">{detailError}</p>
          ) : ticket.statusHistory.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun historique.</p>
          ) : (
            <ul className="space-y-2">
              {ticket.statusHistory.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[entry.toStatusCode]}`} />
                  <span>
                    <strong className="text-gray-700">{entry.changedBy}</strong> → {entry.toStatusName} (
                    {formatShortDate(entry.changedAt)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>
    </aside>
  );
}