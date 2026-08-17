'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, MapPinOff, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { getActualDelayDays, getDueDateUrgency } from '@/lib/ticket-rules';
import { canDeleteAttachment, getTicketPermissionGuard } from '@/lib/ticket-permissions';
import { TicketPinModal } from '@/components/plans/TicketPinModal';
import { Avatar } from './Avatar';
import { AttachmentThumb } from './AttachmentThumb';
import { Dropdown } from './Dropdown';
import {
  ACTUAL_DELAY_TEXT_CLASSES,
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

function SubtasksEditor({
  ticketId,
  subTasks,
  disabled,
}: {
  ticketId: string;
  subTasks: Ticket['subTasks'];
  disabled: boolean;
}) {
  const addTicketSubtask = useTicketStore((state) => state.addTicketSubtask);
  const toggleTicketSubtask = useTicketStore((state) => state.toggleTicketSubtask);
  const removeTicketSubtask = useTicketStore((state) => state.removeTicketSubtask);
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  function submit() {
    const value = draft.trim();
    if (!value) {
      setIsAdding(false);
      return;
    }
    addTicketSubtask(ticketId, value);
    setDraft('');
    setIsAdding(false);
  }

  return (
    <div className="space-y-1.5">
      {subTasks.length === 0 ? (
        <p className="text-xs text-gray-400">Aucune sous-tâche.</p>
      ) : (
        subTasks.map((task) => (
          <div key={task.id} className="group flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={task.done}
              disabled={disabled}
              onChange={(event) => toggleTicketSubtask(ticketId, task.id, event.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span className={`flex-1 ${task.done ? 'text-gray-400 line-through' : ''}`}>{task.label}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTicketSubtask(ticketId, task.id)}
                title="Supprimer la sous-tâche"
                className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        ))
      )}

      {disabled ? null : isAdding ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => (draft.trim() ? submit() : setIsAdding(false))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
            if (event.key === 'Escape') {
              setDraft('');
              setIsAdding(false);
            }
          }}
          placeholder="Nouvelle tâche"
          className="w-full rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <Plus size={12} /> Ajouter une tâche
        </button>
      )}
    </div>
  );
}

function CustomFieldsEditor({
  ticketId,
  fields,
  disabled,
}: {
  ticketId: string;
  fields: Record<string, string>;
  disabled: boolean;
}) {
  const setTicketCustomField = useTicketStore((state) => state.setTicketCustomField);
  const removeTicketCustomField = useTicketStore((state) => state.removeTicketCustomField);
  const [isAdding, setIsAdding] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');

  const entries = Object.entries(fields);

  function cancel() {
    setKeyDraft('');
    setValueDraft('');
    setIsAdding(false);
  }

  function submit() {
    const key = keyDraft.trim();
    const value = valueDraft.trim();
    if (!key || !value) {
      cancel();
      return;
    }
    setTicketCustomField(ticketId, key, value);
    cancel();
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">Aucun champ personnalisé pour ce ticket.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="group flex items-start justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-600">{key}</p>
                <p className="wrap-break-word text-gray-500">{value}</p>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeTicketCustomField(ticketId, key)}
                  title="Supprimer ce champ"
                  className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {disabled ? null : isAdding ? (
        <div className="space-y-1.5 rounded-md border border-dashed border-gray-300 p-2">
          <input
            autoFocus
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
            placeholder="Nom du champ"
            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          />
          <input
            value={valueDraft}
            onChange={(event) => setValueDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
              if (event.key === 'Escape') {
                cancel();
              }
            }}
            placeholder="Valeur"
            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <Plus size={12} /> Ajouter un champ
        </button>
      )}
    </div>
  );
}

function LinkedTicketsEditor({ ticket, disabled }: { ticket: Ticket; disabled: boolean }) {
  const allTickets = useTicketStore((state) => state.tickets);
  const addTicketLink = useTicketStore((state) => state.addTicketLink);
  const removeTicketLink = useTicketStore((state) => state.removeTicketLink);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  const linkedIds = new Set(ticket.links.map((link) => link.id));
  const term = search.trim().toLowerCase();
  const results = !term
    ? []
    : allTickets
        .filter((candidate) => candidate.id !== ticket.id && !linkedIds.has(candidate.id))
        .filter(
          (candidate) =>
            candidate.title.toLowerCase().includes(term) || candidate.reference.toLowerCase().includes(term),
        )
        .slice(0, 8);

  function selectTicket(id: string) {
    addTicketLink(ticket.id, id);
    setSearch('');
    setPickerOpen(false);
  }

  return (
    <div className="space-y-2">
      {ticket.links.length === 0 ? (
        <p className="text-xs text-gray-400">Aucun ticket lié.</p>
      ) : (
        <ul className="space-y-1">
          {ticket.links.map((link) => (
            <li key={link.id} className="group flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveTicketId(link.id)}
                title={link.title}
                className="min-w-0 flex-1 truncate text-left text-blue-600 hover:underline"
              >
                <span className="font-medium">{link.reference}</span> · {link.title}
              </button>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeTicketLink(ticket.id, link.id)}
                  title="Supprimer ce lien"
                  className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {disabled ? null : (
        <div className="relative" ref={pickerRef}>
          {isPickerOpen ? (
            <div className="rounded-md border border-gray-200 p-2 shadow-sm">
              <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1">
                <Search size={12} className="text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un ticket..."
                  className="w-full text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              {term ? (
                <div className="mt-1.5 max-h-40 overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="px-1 py-1 text-xs text-gray-400">Aucun résultat.</p>
                  ) : (
                    results.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => selectTicket(candidate.id)}
                        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-700">{candidate.reference}</span>
                        <span className="truncate text-gray-500">{candidate.title}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <Plus size={12} /> Lier un ticket
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ImpactFieldsEditor({
  ticket,
  disabled,
}: {
  ticket: Ticket;
  disabled: boolean;
}) {
  // No sync-on-prop-change effect needed: the parent renders this with
  // `key={ticket.id}`, so switching tickets remounts the editor and these
  // useState initializers re-run against the newly selected ticket.
  const updateTicketImpact = useTicketStore((state) => state.updateTicketImpact);
  const [costImpactAmount, setCostImpactAmount] = useState(ticket.costImpactAmount?.toString() ?? '');
  const [scheduleImpactDays, setScheduleImpactDays] = useState(ticket.scheduleImpactDays?.toString() ?? '');
  const [externalParty, setExternalParty] = useState(ticket.externalParty ?? '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          id="ticket-is-blocking"
          type="checkbox"
          checked={ticket.isBlocking}
          onChange={(event) => updateTicketImpact(ticket.id, { isBlocking: event.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-200"
        />
        <label htmlFor="ticket-is-blocking" className="text-sm font-medium text-gray-700">
          Ticket bloquant
        </label>
      </div>

      <div>
        <FieldLabel>Partie externe concernée</FieldLabel>
        <input
          value={externalParty}
          onChange={(event) => setExternalParty(event.target.value)}
          onBlur={() => updateTicketImpact(ticket.id, { externalParty: externalParty.trim() })}
          disabled={disabled}
          placeholder="ex : Sous-traitant XYZ"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Impact coût (MAD)</FieldLabel>
          <input
            type="number"
            value={costImpactAmount}
            onChange={(event) => setCostImpactAmount(event.target.value)}
            onBlur={() =>
              updateTicketImpact(ticket.id, {
                costImpactAmount: costImpactAmount ? Number(costImpactAmount) : null,
              })
            }
            disabled={disabled}
            placeholder="0"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        <div>
          <FieldLabel>Impact délai (jours)</FieldLabel>
          <input
            type="number"
            value={scheduleImpactDays}
            onChange={(event) => setScheduleImpactDays(event.target.value)}
            onBlur={() =>
              updateTicketImpact(ticket.id, {
                scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : null,
              })
            }
            disabled={disabled}
            placeholder="0"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

function TicketPlanField({ ticket, disabled }: { ticket: Ticket; disabled: boolean }) {
  const setTicketPlanPin = useTicketStore((state) => state.setTicketPlanPin);
  const removeTicketPlanPin = useTicketStore((state) => state.removeTicketPlanPin);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const currentPin =
    ticket.planId && ticket.planX !== null && ticket.planY !== null
      ? { planId: ticket.planId, planX: ticket.planX, planY: ticket.planY, planPage: ticket.planPage }
      : null;

  return (
    <div>
      <FieldLabel>Plan</FieldLabel>
      {currentPin ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            <MapPin size={12} /> {ticket.planName ?? 'Positionné'}
          </span>
          {!disabled ? (
            <>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Repositionner
              </button>
              <button
                type="button"
                onClick={() => removeTicketPlanPin(ticket.id)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                <MapPinOff size={12} /> Retirer du plan
              </button>
            </>
          ) : null}
        </div>
      ) : disabled ? (
        <p className="text-sm text-gray-400">Non positionné.</p>
      ) : (
        <button
          type="button"
          onClick={() => setIsPinModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          <MapPin size={13} /> Placer sur le plan
        </button>
      )}

      {isPinModalOpen ? (
        <TicketPinModal
          projectId={ticket.project.id}
          currentPin={currentPin}
          onClose={() => setIsPinModalOpen(false)}
          onSave={(pin) => setTicketPlanPin(ticket.id, pin)}
          onRemove={currentPin ? () => removeTicketPlanPin(ticket.id) : undefined}
        />
      ) : null}
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
  const addTicketTag = useTicketStore((state) => state.addTicketTag);
  const removeTicketTag = useTicketStore((state) => state.removeTicketTag);
  const [tagDraft, setTagDraft] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const isDetailLoading = detailLoadingId === ticket.id;
  const isAssignedToMe = ticket.assignees.some((assignee) => assignee.id === currentUser?.id);
  const permissionGuard = getTicketPermissionGuard(currentUser, ticket);
  const canSelfAssign = Boolean(currentUser) && users.some((user) => user.id === currentUser?.id);

  function addTag() {
    const value = tagDraft.trim();
    if (!value) {
      setIsAddingTag(false);
      return;
    }
    if (!ticket.tags.some((tag) => tag.label === value)) {
      addTicketTag(ticket.id, value);
    }
    setTagDraft('');
    setIsAddingTag(false);
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
          {(() => {
            const resolutionDate = ticket.resolvedAt ?? ticket.closedAt;
            const delayDays = getActualDelayDays(ticket.dueDate, resolutionDate);
            if (delayDays === null) return null;
            const isLate = delayDays > 0;
            return (
              <p className={`mt-1 text-xs ${ACTUAL_DELAY_TEXT_CLASSES[isLate ? 'late' : 'onTime']}`}>
                {isLate
                  ? `Retard réel : ${delayDays} j (résolu le ${formatShortDate(resolutionDate)})`
                  : `Traité dans les délais (résolu le ${formatShortDate(resolutionDate)})`}
              </p>
            );
          })()}
        </div>

        <div>
          <FieldLabel>Impact & statut</FieldLabel>
          <ImpactFieldsEditor key={ticket.id} ticket={ticket} disabled={!permissionGuard.canModify} />
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

        <TicketPlanField ticket={ticket} disabled={!permissionGuard.canModify} />

        <div>
          <FieldLabel>Tags</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {ticket.tags.map((tag) => (
              <span
                key={tag.id}
                className="group flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-xs text-gray-600"
              >
                {tag.label}
                {permissionGuard.canModify ? (
                  <button
                    type="button"
                    onClick={() => removeTicketTag(ticket.id, tag.id)}
                    title={`Supprimer ${tag.label}`}
                    className="rounded-full p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                ) : null}
              </span>
            ))}

            {!permissionGuard.canModify ? null : isAddingTag ? (
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
          <SubtasksEditor
            ticketId={ticket.id}
            subTasks={ticket.subTasks}
            disabled={!permissionGuard.canModify}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Champs collectés" count={Object.keys(ticket.customFields).length}>
          <CustomFieldsEditor
            ticketId={ticket.id}
            fields={ticket.customFields}
            disabled={!permissionGuard.canModify}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Tickets liés" count={ticket.links.length}>
          <LinkedTicketsEditor ticket={ticket} disabled={!permissionGuard.canModify} />
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