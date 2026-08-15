import type { Ticket } from '@/types/ticket';
import { KanbanCardContent } from './KanbanCardContent';

// Rendered inside dnd-kit's <DragOverlay>. Must not call useDraggable — the
// dragged card's own hook already owns that id for the duration of the drag.
export function KanbanCardOverlay({ ticket }: { ticket: Ticket }) {
  return (
    <div className="w-72 cursor-grabbing rounded-lg border border-blue-300 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
      <KanbanCardContent ticket={ticket} />
    </div>
  );
}
