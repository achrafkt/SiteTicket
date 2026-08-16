import { Clock, ShieldAlert } from 'lucide-react';
import { TICKET_PRIORITY_LABELS, type Ticket } from '@/types/ticket';
import { getDueDateUrgency, isTicketOverdue } from '@/lib/ticket-rules';
import { AvatarStack } from '@/components/tickets/Avatar';
import {
  BLOCKING_BADGE_CLASSES,
  DUE_DATE_TEXT_CLASSES,
  EXTERNAL_PARTY_BADGE_CLASSES,
  PRIORITY_ICONS,
  PRIORITY_ICON_CLASSES,
  PRIORITY_ICON_BG_CLASSES,
  formatShortDate,
} from '@/components/tickets/ticket-visuals';

// Pure presentational card body, shared between the draggable KanbanCard and
// the static KanbanCardOverlay (which can't call useDraggable a second time
// for the same ticket id while a drag is in progress).
export function KanbanCardContent({ ticket }: { ticket: Ticket }) {
  const PriorityIcon = PRIORITY_ICONS[ticket.priority];
  const overdue = isTicketOverdue(ticket.dueDate, ticket.statusIsTerminal);

  return (
    <div className="flex flex-col gap-2">
      <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{ticket.title}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {ticket.project.name}
        </span>
        {ticket.lot ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-500">
            {ticket.lot}
          </span>
        ) : null}
        {ticket.isBlocking ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BLOCKING_BADGE_CLASSES}`}
          >
            <ShieldAlert size={10} /> Bloquant
          </span>
        ) : null}
        {ticket.externalParty ? (
          <span
            className={`truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${EXTERNAL_PARTY_BADGE_CLASSES}`}
            title="Partie externe concernée"
          >
            {ticket.externalParty}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${PRIORITY_ICON_BG_CLASSES[ticket.priority]}`}
            title={TICKET_PRIORITY_LABELS[ticket.priority]}
          >
            <PriorityIcon size={13} strokeWidth={2.5} className={PRIORITY_ICON_CLASSES[ticket.priority]} />
          </span>
          {ticket.dueDate ? (
            <span
              className={`truncate text-xs ${DUE_DATE_TEXT_CLASSES[getDueDateUrgency(ticket.dueDate, ticket.statusIsTerminal)]}`}
            >
              {formatShortDate(ticket.dueDate)}
            </span>
          ) : null}
          {overdue ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              <Clock size={10} /> Retard
            </span>
          ) : null}
        </div>

        <AvatarStack people={ticket.assignees} />
      </div>
    </div>
  );
}
