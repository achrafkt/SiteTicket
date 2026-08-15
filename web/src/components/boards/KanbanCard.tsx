'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket } from '@/types/ticket';
import { getTicketPermissionGuard } from '@/lib/ticket-permissions';
import { useTicketStore } from '@/store/ticket-store';
import { KanbanCardContent } from './KanbanCardContent';

type KanbanCardProps = {
  ticket: Ticket;
  onOpen: (ticketId: string) => void;
};

export function KanbanCard({ ticket, onOpen }: KanbanCardProps) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const { canModify, modifyReason } = getTicketPermissionGuard(currentUser, ticket);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !canModify,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(ticket.id);
      }}
      title={canModify ? undefined : modifyReason}
      className={`rounded-lg border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-150 hover:border-gray-300 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] ${
        canModify ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      <KanbanCardContent ticket={ticket} />
    </div>
  );
}
