'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Ticket, TicketStatus, TicketType } from '@/types/ticket';
import { STATUS_ICON_CLASSES, STATUS_ICONS } from '@/components/tickets/ticket-visuals';
import { CreateColumnTicketMenu } from './CreateColumnTicketMenu';
import { KanbanCard } from './KanbanCard';

type BoardColumnProps = {
  status: TicketStatus;
  tickets: Ticket[];
  types: TicketType[];
  onOpenTicket: (ticketId: string) => void;
  onCreateTicket: (typeId: string, statusId: string) => void;
};

export function BoardColumn({ status, tickets, types, onOpenTicket, onCreateTicket }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const StatusIcon = STATUS_ICONS[status.code];

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-72 shrink-0 flex-col rounded-xl transition-colors duration-150 ${
        isOver ? 'bg-blue-50/70 ring-2 ring-blue-200' : 'bg-slate-100/70'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <StatusIcon size={14} strokeWidth={2.5} className={`shrink-0 ${STATUS_ICON_CLASSES[status.code]}`} />
          <span className="truncate text-sm font-semibold text-slate-700">{status.name}</span>
          <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
            {tickets.length}
          </span>
        </div>
        <CreateColumnTicketMenu
          types={types}
          statusName={status.name}
          onSelectType={(typeId) => onCreateTicket(typeId, status.id)}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
        {tickets.map((ticket) => (
          <KanbanCard key={ticket.id} ticket={ticket} onOpen={onOpenTicket} />
        ))}
        {tickets.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-400">Aucun ticket</p>
        ) : null}
      </div>
    </div>
  );
}
