import { create } from 'zustand';
import { CURRENT_USER, MOCK_TICKETS } from '@/data/mock-tickets';
import { isTicketOverdue } from '@/lib/ticket-rules';
import type { Ticket } from '@/types/ticket';

export type ViewKey =
  | 'my_tickets'
  | 'past_due'
  | 'high_priority'
  | 'unassigned'
  | 'all_tickets'
  | 'my_reserves_to_lift'
  | 'rfi_waiting_moe'
  | 'overdue_by_lot';

type TicketStoreState = {
  tickets: Ticket[];
  activeView: ViewKey;
  activeTicketId: string | null;
  searchTerm: string;
  isKnowledgePanelOpen: boolean;
  isDetailsPanelOpen: boolean;
  setActiveView: (view: ViewKey) => void;
  setActiveTicketId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  updateTicketStatus: (id: string, status: Ticket['status']) => void;
  updateTicketPriority: (id: string, priority: Ticket['priority']) => void;
  assignTicketToCurrentUser: (id: string) => void;
  toggleKnowledgePanel: (open?: boolean) => void;
  toggleDetailsPanel: (open?: boolean) => void;
  addMessage: (ticketId: string, message: Ticket['messages'][number]) => void;
};

function isOverdue(ticket: Ticket) {
  return isTicketOverdue(ticket.dueDate, ticket.status);
}

export function filterTicketsByView(tickets: Ticket[], view: ViewKey): Ticket[] {
  switch (view) {
    case 'my_tickets':
      return tickets.filter((ticket) =>
        ticket.assignees.some((assignee) => assignee.name === CURRENT_USER.name),
      );
    case 'past_due':
      return tickets.filter((ticket) => isOverdue(ticket));
    case 'high_priority':
      return tickets.filter((ticket) => ticket.priority === 'high' || ticket.priority === 'urgent');
    case 'unassigned':
      return tickets.filter((ticket) => ticket.assignees.length === 0);
    case 'my_reserves_to_lift':
      return tickets.filter(
        (ticket) =>
          ticket.type === 'reserve' &&
          ticket.assignees.some((assignee) => assignee.name === CURRENT_USER.name) &&
          ticket.status !== 'done',
      );
    case 'rfi_waiting_moe':
      return tickets.filter((ticket) => ticket.type === 'rfi' && ticket.status === 'waiting');
    case 'overdue_by_lot':
      return [...tickets.filter((ticket) => isOverdue(ticket))].sort((a, b) =>
        a.lot.localeCompare(b.lot),
      );
    case 'all_tickets':
    default:
      return tickets;
  }
}

export const useTicketStore = create<TicketStoreState>((set) => ({
  tickets: MOCK_TICKETS,
  activeView: 'all_tickets',
  activeTicketId: MOCK_TICKETS[0]?.id ?? null,
  searchTerm: '',
  isKnowledgePanelOpen: false,
  isDetailsPanelOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setActiveTicketId: (id) => set({ activeTicketId: id }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  updateTicketStatus: (id, status) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id
          ? {
              ...ticket,
              status,
              statusHistory: [
                ...ticket.statusHistory,
                {
                  id: `h-${Date.now()}`,
                  fromStatus: ticket.status,
                  toStatus: status,
                  changedBy: CURRENT_USER.name,
                  changedAt: new Date().toISOString(),
                },
              ],
            }
          : ticket,
      ),
    })),
  updateTicketPriority: (id, priority) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, priority } : ticket)),
    })),
  toggleKnowledgePanel: (open) =>
    set((state) => ({ isKnowledgePanelOpen: open ?? !state.isKnowledgePanelOpen })),
  assignTicketToCurrentUser: (id) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id
          ? { ...ticket, assignees: [{ name: CURRENT_USER.name, initials: CURRENT_USER.initials }] }
          : ticket,
      ),
    })),
  toggleDetailsPanel: (open) =>
    set((state) => ({ isDetailsPanelOpen: open ?? !state.isDetailsPanelOpen })),
  addMessage: (ticketId, message) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, messages: [...ticket.messages, message] } : ticket,
      ),
    })),
}));
