import { create } from 'zustand';
import { ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/current-user';
import { mapComment, mapProject, mapStatus, mapTicket, mapType } from '@/lib/ticket-mapper';
import { isTicketOverdue } from '@/lib/ticket-rules';
import {
  createComment,
  createTicket as createTicketRequest,
  getProjects,
  getTicket,
  getTicketStatuses,
  getTicketTypes,
  getTickets,
  updateTicket,
  type CreateTicketPayload,
} from '@/lib/tickets-api';
import type { Person, Project, Ticket, TicketPriority, TicketStatus, TicketType } from '@/types/ticket';

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
  statuses: TicketStatus[];
  types: TicketType[];
  projects: Project[];
  currentUser: Person | null;
  activeView: ViewKey;
  activeTicketId: string | null;
  searchTerm: string;
  isKnowledgePanelOpen: boolean;
  isDetailsPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  detailLoadingId: string | null;
  detailError: string | null;
  detailLoadedIds: Set<string>;
  isSubmittingComment: boolean;
  commentError: string | null;
  isCreatePanelOpen: boolean;
  createDraftTypeId: string | null;
  isCreatingTicket: boolean;
  createTicketError: string | null;
  loadInitialData: () => Promise<void>;
  setActiveView: (view: ViewKey) => void;
  setActiveTicketId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  updateTicketStatus: (id: string, statusId: string) => Promise<void>;
  updateTicketPriority: (id: string, priority: TicketPriority) => Promise<void>;
  assignTicketToCurrentUser: (id: string) => Promise<void>;
  toggleKnowledgePanel: (open?: boolean) => void;
  toggleDetailsPanel: (open?: boolean) => void;
  addComment: (ticketId: string, body: string, isInternal: boolean) => Promise<void>;
  openCreateTicketPanel: (typeId: string) => void;
  closeCreateTicketPanel: () => void;
  createTicket: (payload: Omit<CreateTicketPayload, 'ticketTypeId'>) => Promise<boolean>;
};

export function filterTicketsByView(
  tickets: Ticket[],
  view: ViewKey,
  currentUserId: string | null,
): Ticket[] {
  switch (view) {
    case 'my_tickets':
      return tickets.filter((ticket) =>
        ticket.assignees.some((assignee) => assignee.id === currentUserId),
      );
    case 'past_due':
      return tickets.filter((ticket) => isTicketOverdue(ticket.dueDate, ticket.statusIsTerminal));
    case 'high_priority':
      return tickets.filter((ticket) => ticket.priority === 'high' || ticket.priority === 'critical');
    case 'unassigned':
      return tickets.filter((ticket) => ticket.assignees.length === 0);
    case 'my_reserves_to_lift':
      return tickets.filter(
        (ticket) =>
          ticket.type === 'PUNCH' &&
          ticket.assignees.some((assignee) => assignee.id === currentUserId) &&
          !ticket.statusIsTerminal,
      );
    case 'rfi_waiting_moe':
      return tickets.filter((ticket) => ticket.type === 'RFI' && ticket.status === 'PENDING');
    case 'overdue_by_lot':
      return [...tickets.filter((ticket) => isTicketOverdue(ticket.dueDate, ticket.statusIsTerminal))].sort(
        (a, b) => (a.lot ?? '').localeCompare(b.lot ?? ''),
      );
    case 'all_tickets':
    default:
      return tickets;
  }
}

export const useTicketStore = create<TicketStoreState>((set, get) => {
  async function loadTicketDetail(id: string) {
    set({ detailLoadingId: id, detailError: null });
    try {
      const apiTicket = await getTicket(id);
      const detailed = mapTicket(apiTicket);
      set((state) => {
        const nextLoaded = new Set(state.detailLoadedIds);
        nextLoaded.add(id);
        return {
          tickets: state.tickets.map((ticket) =>
            ticket.id === id
              ? {
                  ...detailed,
                  tags: ticket.tags,
                  subTasks: ticket.subTasks,
                  linkedTicketIds: ticket.linkedTicketIds,
                  watchersCount: ticket.watchersCount,
                }
              : ticket,
          ),
          detailLoadingId: null,
          detailLoadedIds: nextLoaded,
        };
      });
    } catch (err) {
      set({
        detailLoadingId: null,
        detailError:
          err instanceof ApiError ? err.message : 'Impossible de charger le détail du ticket.',
      });
    }
  }

  return {
    tickets: [],
    statuses: [],
    types: [],
    projects: [],
    currentUser: getStoredUser(),
    activeView: 'all_tickets',
    activeTicketId: null,
    searchTerm: '',
    isKnowledgePanelOpen: false,
    isDetailsPanelOpen: true,
    isLoading: false,
    error: null,
    detailLoadingId: null,
    detailError: null,
    detailLoadedIds: new Set(),
    isSubmittingComment: false,
    commentError: null,
    isCreatePanelOpen: false,
    createDraftTypeId: null,
    isCreatingTicket: false,
    createTicketError: null,

    loadInitialData: async () => {
      set({ isLoading: true, error: null });
      try {
        const [apiTickets, apiStatuses, apiTypes, apiProjects] = await Promise.all([
          getTickets(),
          getTicketStatuses(),
          getTicketTypes(),
          getProjects(),
        ]);
        const tickets = apiTickets.map(mapTicket);
        set({
          tickets,
          statuses: apiStatuses.map(mapStatus),
          types: apiTypes.map(mapType),
          projects: apiProjects.map(mapProject),
          isLoading: false,
        });
        get().setActiveTicketId(tickets[0]?.id ?? null);
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof ApiError ? err.message : 'Impossible de charger les tickets.',
        });
      }
    },

    setActiveView: (view) => set({ activeView: view }),

    setActiveTicketId: (id) => {
      set({ activeTicketId: id });
      if (id && !get().detailLoadedIds.has(id)) {
        loadTicketDetail(id);
      }
    },

    setSearchTerm: (term) => set({ searchTerm: term }),

    updateTicketStatus: async (id, statusId) => {
      const status = get().statuses.find((candidate) => candidate.id === statusId);
      if (!status) return;

      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id
            ? {
                ...ticket,
                statusId: status.id,
                status: status.code,
                statusName: status.name,
                statusIsTerminal: status.isTerminal,
              }
            : ticket,
        ),
      }));

      try {
        await updateTicket(id, { statusId });
      } catch (err) {
        set({
          tickets: previous,
          error: err instanceof ApiError ? err.message : 'Impossible de mettre à jour le statut.',
        });
      }
    },

    updateTicketPriority: async (id, priority) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, priority } : ticket)),
      }));

      try {
        await updateTicket(id, { priority });
      } catch (err) {
        set({
          tickets: previous,
          error: err instanceof ApiError ? err.message : 'Impossible de mettre à jour la priorité.',
        });
      }
    },

    assignTicketToCurrentUser: async (id) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? { ...ticket, assignees: [currentUser] } : ticket,
        ),
      }));

      try {
        await updateTicket(id, { assignedTo: currentUser.id });
      } catch (err) {
        set({
          tickets: previous,
          error: err instanceof ApiError ? err.message : "Impossible d'assigner le ticket.",
        });
      }
    },

    toggleKnowledgePanel: (open) =>
      set((state) => ({ isKnowledgePanelOpen: open ?? !state.isKnowledgePanelOpen })),

    toggleDetailsPanel: (open) =>
      set((state) => ({ isDetailsPanelOpen: open ?? !state.isDetailsPanelOpen })),

    addComment: async (ticketId, body, isInternal) => {
      set({ isSubmittingComment: true, commentError: null });
      try {
        const apiComment = await createComment(ticketId, body, isInternal);
        const comment = mapComment(apiComment);
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, messages: [...ticket.messages, comment] } : ticket,
          ),
          isSubmittingComment: false,
        }));
      } catch (err) {
        set({
          isSubmittingComment: false,
          commentError:
            err instanceof ApiError ? err.message : "Impossible d'envoyer le commentaire.",
        });
      }
    },

    openCreateTicketPanel: (typeId) =>
      set({ isCreatePanelOpen: true, createDraftTypeId: typeId, createTicketError: null }),

    closeCreateTicketPanel: () =>
      set({ isCreatePanelOpen: false, createDraftTypeId: null, createTicketError: null }),

    createTicket: async (payload) => {
      const typeId = get().createDraftTypeId;
      if (!typeId) return false;

      set({ isCreatingTicket: true, createTicketError: null });
      try {
        const apiTicket = await createTicketRequest({ ...payload, ticketTypeId: typeId });
        const ticket = mapTicket(apiTicket);
        set((state) => ({
          tickets: [ticket, ...state.tickets],
          isCreatingTicket: false,
          isCreatePanelOpen: false,
          createDraftTypeId: null,
        }));
        get().setActiveTicketId(ticket.id);
        return true;
      } catch (err) {
        set({
          isCreatingTicket: false,
          createTicketError: err instanceof ApiError ? err.message : 'Impossible de créer le ticket.',
        });
        return false;
      }
    },
  };
});
