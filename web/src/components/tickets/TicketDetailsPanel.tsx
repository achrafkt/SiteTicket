'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { getDueDateUrgency } from '@/lib/ticket-rules';
import { CURRENT_USER } from '@/data/mock-tickets';
import { Avatar } from './Avatar';
import {
  DUE_DATE_TEXT_CLASSES,
  PRIORITY_DOT_CLASSES,
  REPORTER_ROLE_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  formatShortDate,
} from './ticket-visuals';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type Ticket,
  type TicketPriority,
  type TicketStatusCode,
} from '@/types/ticket';

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
  const updateTicketStatus = useTicketStore((state) => state.updateTicketStatus);
  const updateTicketPriority = useTicketStore((state) => state.updateTicketPriority);
  const assignTicketToCurrentUser = useTicketStore((state) => state.assignTicketToCurrentUser);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const [tagDraft, setTagDraft] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tags, setTags] = useState(ticket.tags);

  const isAssignedToMe = ticket.assignees.some((assignee) => assignee.name === CURRENT_USER.name);

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
  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white pl-3 pr-2 focus-within:ring-1 focus-within:ring-blue-500">
    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[ticket.status]}`} />
    <select
      value={ticket.status}
      onChange={(event) => updateTicketStatus(ticket.id, event.target.value as TicketStatusCode)}
      className="w-full min-w-0 truncate appearance-none bg-transparent py-1.5 text-sm font-medium text-gray-700 focus:outline-none"
    >
      {(Object.keys(TICKET_STATUS_LABELS) as TicketStatusCode[]).map((code) => (
        <option key={code} value={code}>
          {TICKET_STATUS_LABELS[code]}
        </option>
      ))}
    </select>
    <ChevronDown size={14} className="shrink-0 text-gray-400" />
  </div>
  <button
    type="button"
    onClick={() => toggleDetailsPanel(false)}
    className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
  >
    <X size={16} />
  </button>
</div>

      <div className="space-y-6 p-4">
        <div>
           <FieldLabel>Priorité</FieldLabel>
  <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white pl-3 pr-2 focus-within:ring-1 focus-within:ring-blue-500">
    <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT_CLASSES[ticket.priority]}`} />
    <select
      value={ticket.priority}
      onChange={(event) => updateTicketPriority(ticket.id, event.target.value as TicketPriority)}
      className="w-full appearance-none bg-transparent py-1.5 text-sm font-medium text-gray-700 focus:outline-none"
    >
      {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((code) => (
        <option key={code} value={code}>
          {TICKET_PRIORITY_LABELS[code]}
        </option>
      ))}
    </select>
    <ChevronDown size={14} className="shrink-0 text-gray-400" />
  </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Assigné à</p>
            {isAssignedToMe ? (
              <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-gray-300">
                Assigné à moi
              </span>
            ) : (
              <button
                type="button"
                onClick={() => assignTicketToCurrentUser(ticket.id)}
                className="shrink-0 whitespace-nowrap text-[11px] font-medium text-blue-600 hover:underline"
              >
                Assigner à moi
              </button>
            )}
          </div>
          {ticket.assignees.length > 0 ? (
            <div className="flex flex-col gap-2">
              {ticket.assignees.map((assignee) => (
                <div key={assignee.name} className="flex items-center gap-2">
                  <Avatar initials={assignee.initials} />
                  <span className="text-sm text-gray-700">{assignee.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Non assigné</p>
          )}
        </div>

        <div>
          <FieldLabel>Chantier / Projet</FieldLabel>
          <p className="text-sm text-gray-700">{ticket.project}</p>
        </div>

        <div>
          <FieldLabel>Type de ticket</FieldLabel>
          <p className="text-sm text-gray-700">{TICKET_TYPE_LABELS[ticket.type]}</p>
        </div>

        <div>
          <FieldLabel>Date d&apos;échéance</FieldLabel>
          <p className={`text-sm ${DUE_DATE_TEXT_CLASSES[getDueDateUrgency(ticket.dueDate, ticket.status)]}`}>
            {formatShortDate(ticket.dueDate)}
          </p>
        </div>

        <div>
          <FieldLabel>Rapporteur</FieldLabel>
          <div className="flex items-center gap-2">
            <Avatar initials={ticket.reporter.name.split(' ').map((part) => part[0]).join('')} />
            <span className="text-sm text-gray-700">{ticket.reporter.name}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                REPORTER_ROLE_BADGE_CLASSES[ticket.reporter.role] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {ticket.reporter.role}
            </span>
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

        <CollapsibleSection title="Historique" count={ticket.statusHistory.length}>
          <ul className="space-y-2">
            {ticket.statusHistory.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 text-xs text-gray-500">
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[entry.toStatus]}`} />
                <span>
                  <strong className="text-gray-700">{entry.changedBy}</strong> →{' '}
                  {TICKET_STATUS_LABELS[entry.toStatus]} ({formatShortDate(entry.changedAt)})
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      </div>
    </aside>
  );
}