'use client';

import { Clock } from 'lucide-react';
import { TICKET_PRIORITY_LABELS, type Ticket } from '@/types/ticket';
import { isTicketOverdue } from '@/lib/ticket-rules';
import { AvatarStack } from './Avatar';
import {
  PRIORITY_ICONS,
  PRIORITY_ICON_CLASSES,
  PRIORITY_ICON_BG_CLASSES,
  STATUS_BADGE_CLASSES,
  formatShortDate,
} from './ticket-visuals';

type TicketCardProps = {
  ticket: Ticket;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
};

export function TicketCard({ ticket, isSelected, isChecked, onSelect, onToggleCheck }: TicketCardProps) {
  const PriorityIcon = PRIORITY_ICONS[ticket.priority];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect();
      }}
      className={`group relative flex cursor-pointer flex-col gap-3 px-4 py-3.5 transition-all duration-200 ${
        isSelected
          ? 'bg-blue-50/90 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]'
          : 'hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold leading-5 text-slate-950">
          {ticket.title}
        </p>
        <span
          className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
          title="Dernière activité"
        >
          {formatShortDate(ticket.lastActivityAt)}
        </span>
      </div>

      {ticket.lastActivityPreview ? (
        <p className="min-w-0 truncate text-xs text-slate-500">
          {ticket.lastActivityAuthor ? (
            <span className="font-medium text-slate-600">{ticket.lastActivityAuthor} : </span>
          ) : null}
          {ticket.lastActivityPreview}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onClick={(event) => event.stopPropagation()}
            onChange={onToggleCheck}
            className="h-4 w-4 shrink-0 rounded border-gray-300 accent-gray-400 focus:ring-gray-300"
          />
          {ticket.lot ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-slate-500">
              {ticket.lot}
            </span>
          ) : null}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[ticket.status]}`}
          >
            {ticket.statusName}
          </span>
          {isTicketOverdue(ticket.dueDate, ticket.statusIsTerminal) ? (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              <Clock size={11} /> En retard
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${PRIORITY_ICON_BG_CLASSES[ticket.priority]}`}
            title={TICKET_PRIORITY_LABELS[ticket.priority]}
          >
            <PriorityIcon size={13} strokeWidth={2.5} className={PRIORITY_ICON_CLASSES[ticket.priority]} />
          </span>
          <AvatarStack people={ticket.assignees} />
        </div>
      </div>
    </div>
  );
}