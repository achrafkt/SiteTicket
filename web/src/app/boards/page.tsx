'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useTicketStore } from '@/store/ticket-store';
import { CreateTicketPanel } from '@/components/tickets/CreateTicketPanel';
import { TicketDetailsPanel } from '@/components/tickets/TicketDetailsPanel';
import { BoardFilterBar } from '@/components/boards/BoardFilterBar';
import { BoardColumn } from '@/components/boards/BoardColumn';
import { KanbanCardOverlay } from '@/components/boards/KanbanCardOverlay';
import { EMPTY_BOARD_FILTERS, type BoardFilters } from '@/components/boards/board-types';

export default function BoardsPage() {
  const tickets = useTicketStore((state) => state.tickets);
  const statuses = useTicketStore((state) => state.statuses);
  const types = useTicketStore((state) => state.types);
  const projects = useTicketStore((state) => state.projects);
  const users = useTicketStore((state) => state.users);
  const activeTicketId = useTicketStore((state) => state.activeTicketId);
  const isDetailsPanelOpen = useTicketStore((state) => state.isDetailsPanelOpen);
  const isCreatePanelOpen = useTicketStore((state) => state.isCreatePanelOpen);
  const isLoading = useTicketStore((state) => state.isLoading);
  const error = useTicketStore((state) => state.error);
  const loadInitialData = useTicketStore((state) => state.loadInitialData);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const updateTicketStatus = useTicketStore((state) => state.updateTicketStatus);
  const openCreateTicketPanel = useTicketStore((state) => state.openCreateTicketPanel);

  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    // loadInitialData() auto-selects the first ticket and the details panel
    // defaults to open — close it so the board starts clean until a card is
    // clicked (see plan: "Data loading" gotcha).
    toggleDetailsPanel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.sortOrder - b.sortOrder),
    [statuses],
  );

  const visibleTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (filters.projectId && ticket.project.id !== filters.projectId) return false;
        if (filters.assigneeId && !ticket.assignees.some((assignee) => assignee.id === filters.assigneeId)) {
          return false;
        }
        if (filters.priority && ticket.priority !== filters.priority) return false;
        return true;
      }),
    [tickets, filters],
  );

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? null,
    [tickets, activeTicketId],
  );

  const draggedTicket = useMemo(
    () => (draggedTicketId ? tickets.find((ticket) => ticket.id === draggedTicketId) ?? null : null),
    [tickets, draggedTicketId],
  );

  function handleOpenTicket(ticketId: string) {
    setActiveTicketId(ticketId);
    toggleDetailsPanel(true);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggedTicketId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedTicketId(null);
    const { active, over } = event;
    if (!over) return;
    const ticket = tickets.find((candidate) => candidate.id === active.id);
    if (!ticket || over.id === ticket.statusId) return;
    updateTicketStatus(active.id as string, over.id as string);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <BoardFilterBar filters={filters} onChange={setFilters} projects={projects} users={users} />

      <div className="flex flex-1 overflow-hidden rounded-[10px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            Chargement des tickets...
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => loadInitialData()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex h-full flex-1 gap-3 overflow-x-auto p-4">
                {sortedStatuses.map((status) => (
                  <BoardColumn
                    key={status.id}
                    status={status}
                    tickets={visibleTickets.filter((ticket) => ticket.statusId === status.id)}
                    types={types}
                    onOpenTicket={handleOpenTicket}
                    onCreateTicket={(typeId, statusId) => openCreateTicketPanel(typeId, statusId)}
                  />
                ))}
              </div>
              <DragOverlay>{draggedTicket ? <KanbanCardOverlay ticket={draggedTicket} /> : null}</DragOverlay>
            </DndContext>

            {isCreatePanelOpen ? (
              <CreateTicketPanel />
            ) : isDetailsPanelOpen && activeTicket ? (
              <TicketDetailsPanel ticket={activeTicket} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
