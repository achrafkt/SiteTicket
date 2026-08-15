import { create } from 'zustand';
import { ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/current-user';
import {
  mapAttachment,
  mapComment,
  mapLinkedTicket,
  mapPerson,
  mapProject,
  mapStatus,
  mapSubtask,
  mapTag,
  mapTicket,
  mapType,
} from '@/lib/ticket-mapper';
import { isTicketOverdue } from '@/lib/ticket-rules';
import { buildMockNotifications } from '@/lib/notifications-mock';
import {
  addTicketLink as addTicketLinkRequest,
  addTicketSubtask as addTicketSubtaskRequest,
  addTicketTag as addTicketTagRequest,
  createComment,
  createTicket as createTicketRequest,
  deleteAttachment,
  deleteTicket as deleteTicketRequest,
  getAssignableUsers,
  getProjects,
  getTicket,
  getTicketStatuses,
  getTicketTypes,
  getTickets,
  removeTicketCustomField as removeTicketCustomFieldRequest,
  removeTicketLink as removeTicketLinkRequest,
  removeTicketSubtask as removeTicketSubtaskRequest,
  removeTicketTag as removeTicketTagRequest,
  setTicketCustomField as setTicketCustomFieldRequest,
  updateTicket,
  updateTicketSubtask,
  uploadAttachment,
  type CreateTicketPayload,
} from '@/lib/tickets-api';
import type {
  Attachment,
  Person,
  Project,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TicketType,
} from '@/types/ticket';
import type { Notification } from '@/types/notification';

export type ViewKey =
  | 'my_tickets'
  | 'past_due'
  | 'high_priority'
  | 'unassigned'
  | 'all_tickets'
  | 'my_reserves_to_lift'
  | 'rfi_waiting_moe'
  | 'overdue_by_lot';

export const VIEWS_SIDEBAR_DEFAULT_WIDTH = 256;
export const VIEWS_SIDEBAR_COLLAPSED_WIDTH = 64;
export const VIEWS_SIDEBAR_COLLAPSE_THRESHOLD = 160;
export const VIEWS_SIDEBAR_MAX_WIDTH = 360;

export function getEffectiveViewsSidebarWidth(width: number): number {
  return width <= VIEWS_SIDEBAR_COLLAPSE_THRESHOLD ? VIEWS_SIDEBAR_COLLAPSED_WIDTH : width;
}

type TicketStoreState = {
  tickets: Ticket[];
  statuses: TicketStatus[];
  types: TicketType[];
  projects: Project[];
  users: Person[];
  currentUser: Person | null;
  activeView: ViewKey;
  activeTicketId: string | null;
  searchTerm: string;
  notifications: Notification[];
  isKnowledgePanelOpen: boolean;
  isDetailsPanelOpen: boolean;
  viewsSidebarWidth: number;
  isLoading: boolean;
  error: string | null;
  ticketActionError: string | null;
  detailLoadingId: string | null;
  detailError: string | null;
  detailLoadedIds: Set<string>;
  isSubmittingComment: boolean;
  commentError: string | null;
  isCreatePanelOpen: boolean;
  createDraftTypeId: string | null;
  createDraftStatusId: string | null;
  isCreatingTicket: boolean;
  createTicketError: string | null;
  isUploadingAttachment: boolean;
  attachmentError: string | null;
  resetSession: (user: Person | null) => void;
  setCurrentUser: (user: Person) => void;
  loadInitialData: () => Promise<void>;
  setActiveView: (view: ViewKey) => void;
  setActiveTicketId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateTicketStatus: (id: string, statusId: string) => Promise<void>;
  updateTicketPriority: (id: string, priority: TicketPriority) => Promise<void>;
  assignTicketToUser: (id: string, userId: string | null) => Promise<void>;
  toggleKnowledgePanel: (open?: boolean) => void;
  toggleDetailsPanel: (open?: boolean) => void;
  setViewsSidebarWidth: (width: number) => void;
  addComment: (ticketId: string, body: string, isInternal: boolean) => Promise<TicketMessage | null>;
  openCreateTicketPanel: (typeId: string, statusId?: string) => void;
  closeCreateTicketPanel: () => void;
  createTicket: (payload: Omit<CreateTicketPayload, 'ticketTypeId'>) => Promise<Ticket | null>;
  deleteTicket: (id: string) => Promise<boolean>;
  uploadTicketAttachment: (
    ticketId: string,
    file: File,
    commentId?: string,
  ) => Promise<Attachment | null>;
  deleteTicketAttachment: (ticketId: string, attachmentId: string) => Promise<void>;
  addTicketTag: (ticketId: string, label: string) => Promise<void>;
  removeTicketTag: (ticketId: string, tagId: string) => Promise<void>;
  addTicketSubtask: (ticketId: string, label: string) => Promise<void>;
  toggleTicketSubtask: (ticketId: string, subtaskId: string, done: boolean) => Promise<void>;
  removeTicketSubtask: (ticketId: string, subtaskId: string) => Promise<void>;
  addTicketLink: (ticketId: string, linkedTicketId: string) => Promise<void>;
  removeTicketLink: (ticketId: string, linkedTicketId: string) => Promise<void>;
  setTicketCustomField: (ticketId: string, key: string, value: string) => Promise<void>;
  removeTicketCustomField: (ticketId: string, key: string) => Promise<void>;
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

function sessionInitialState(user: Person | null) {
  return {
    tickets: [] as Ticket[],
    statuses: [] as TicketStatus[],
    types: [] as TicketType[],
    projects: [] as Project[],
    users: [] as Person[],
    currentUser: user,
    activeView: 'all_tickets' as ViewKey,
    activeTicketId: null,
    searchTerm: '',
    notifications: [] as Notification[],
    isKnowledgePanelOpen: false,
    isDetailsPanelOpen: true,
    viewsSidebarWidth: VIEWS_SIDEBAR_DEFAULT_WIDTH,
    isLoading: false,
    error: null,
    ticketActionError: null,
    detailLoadingId: null,
    detailError: null,
    detailLoadedIds: new Set<string>(),
    isSubmittingComment: false,
    commentError: null,
    isCreatePanelOpen: false,
    createDraftTypeId: null,
    createDraftStatusId: null,
    isCreatingTicket: false,
    createTicketError: null,
    isUploadingAttachment: false,
    attachmentError: null,
  };
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
    ...sessionInitialState(getStoredUser()),

    resetSession: (user) => set(sessionInitialState(user)),

    setCurrentUser: (user) => set({ currentUser: user }),

    loadInitialData: async () => {
      set({ isLoading: true, error: null });
      try {
        const [apiTickets, apiStatuses, apiTypes, apiProjects, apiUsers] = await Promise.all([
          getTickets(),
          getTicketStatuses(),
          getTicketTypes(),
          getProjects(),
          getAssignableUsers(),
        ]);
        const tickets = apiTickets.map(mapTicket);
        set({
          tickets,
          statuses: apiStatuses.map(mapStatus),
          types: apiTypes.map(mapType),
          projects: apiProjects.map(mapProject),
          users: apiUsers.map(mapPerson),
          notifications: buildMockNotifications(tickets),
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

    markNotificationRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      })),

    markAllNotificationsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
      })),

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
        ticketActionError: null,
      }));

      try {
        await updateTicket(id, { statusId });
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de mettre à jour le statut.',
        });
      }
    },

    updateTicketPriority: async (id, priority) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, priority } : ticket)),
        ticketActionError: null,
      }));

      try {
        await updateTicket(id, { priority });
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de mettre à jour la priorité.',
        });
      }
    },

    assignTicketToUser: async (id, userId) => {
      const assignee = userId ? get().users.find((user) => user.id === userId) ?? null : null;
      if (userId && !assignee) return;

      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? { ...ticket, assignees: assignee ? [assignee] : [] } : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await updateTicket(id, { assignedTo: userId });
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError: err instanceof ApiError ? err.message : "Impossible d'assigner le ticket.",
        });
      }
    },

    toggleKnowledgePanel: (open) =>
      set((state) => ({ isKnowledgePanelOpen: open ?? !state.isKnowledgePanelOpen })),

    toggleDetailsPanel: (open) =>
      set((state) => ({ isDetailsPanelOpen: open ?? !state.isDetailsPanelOpen })),

    setViewsSidebarWidth: (width) =>
      set({
        viewsSidebarWidth: Math.min(
          VIEWS_SIDEBAR_MAX_WIDTH,
          Math.max(VIEWS_SIDEBAR_COLLAPSED_WIDTH, width),
        ),
      }),

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
        return comment;
      } catch (err) {
        set({
          isSubmittingComment: false,
          commentError:
            err instanceof ApiError ? err.message : "Impossible d'envoyer le commentaire.",
        });
        return null;
      }
    },

    openCreateTicketPanel: (typeId, statusId) =>
      set({
        isCreatePanelOpen: true,
        createDraftTypeId: typeId,
        createDraftStatusId: statusId ?? null,
        createTicketError: null,
      }),

    closeCreateTicketPanel: () =>
      set({
        isCreatePanelOpen: false,
        createDraftTypeId: null,
        createDraftStatusId: null,
        createTicketError: null,
      }),

    createTicket: async (payload) => {
      const typeId = get().createDraftTypeId;
      if (!typeId) return null;

      // Captured before the panel-closing set() below wipes it.
      const targetStatusId = get().createDraftStatusId;

      set({ isCreatingTicket: true, createTicketError: null });
      try {
        const apiTicket = await createTicketRequest({ ...payload, ticketTypeId: typeId });
        const ticket = mapTicket(apiTicket);
        set((state) => ({
          tickets: [ticket, ...state.tickets],
          isCreatingTicket: false,
          isCreatePanelOpen: false,
          createDraftTypeId: null,
          createDraftStatusId: null,
        }));
        get().setActiveTicketId(ticket.id);

        // The create endpoint has no statusId field, so a board column's "+"
        // button lands the ticket in its default status first, then patches
        // it into the target column via the existing status-update action.
        if (targetStatusId && targetStatusId !== ticket.statusId) {
          await get().updateTicketStatus(ticket.id, targetStatusId);
        }

        return ticket;
      } catch (err) {
        set({
          isCreatingTicket: false,
          createDraftStatusId: null,
          createTicketError: err instanceof ApiError ? err.message : 'Impossible de créer le ticket.',
        });
        return null;
      }
    },

    deleteTicket: async (id) => {
      const previous = get().tickets;
      const wasActive = get().activeTicketId === id;
      const remaining = previous.filter((ticket) => ticket.id !== id);

      set({ tickets: remaining, activeTicketId: wasActive ? remaining[0]?.id ?? null : get().activeTicketId });

      try {
        await deleteTicketRequest(id);
        return true;
      } catch (err) {
        set({
          tickets: previous,
          activeTicketId: wasActive ? id : get().activeTicketId,
          error: err instanceof ApiError ? err.message : 'Impossible de supprimer le ticket.',
        });
        return false;
      }
    },

    uploadTicketAttachment: async (ticketId, file, commentId) => {
      set({ isUploadingAttachment: true, attachmentError: null });
      try {
        const apiAttachment = await uploadAttachment(ticketId, file, commentId);
        const attachment = mapAttachment(apiAttachment);
        set((state) => ({
          tickets: state.tickets.map((ticket) => {
            if (ticket.id !== ticketId) return ticket;
            return {
              ...ticket,
              attachments: [...ticket.attachments, attachment],
              messages: commentId
                ? ticket.messages.map((message) =>
                    message.id === commentId
                      ? { ...message, attachments: [...message.attachments, attachment] }
                      : message,
                  )
                : ticket.messages,
            };
          }),
          isUploadingAttachment: false,
        }));
        return attachment;
      } catch (err) {
        set({
          isUploadingAttachment: false,
          attachmentError:
            err instanceof ApiError ? err.message : "Impossible d'envoyer la pièce jointe.",
        });
        return null;
      }
    },

    deleteTicketAttachment: async (ticketId, attachmentId) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                attachments: ticket.attachments.filter((attachment) => attachment.id !== attachmentId),
                messages: ticket.messages.map((message) => ({
                  ...message,
                  attachments: message.attachments.filter((attachment) => attachment.id !== attachmentId),
                })),
              }
            : ticket,
        ),
      }));

      try {
        await deleteAttachment(ticketId, attachmentId);
      } catch (err) {
        set({
          tickets: previous,
          attachmentError:
            err instanceof ApiError ? err.message : 'Impossible de supprimer la pièce jointe.',
        });
      }
    },

    addTicketTag: async (ticketId, label) => {
      set({ ticketActionError: null });
      try {
        const apiTag = await addTicketTagRequest(ticketId, label);
        const tag = mapTag(apiTag);
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, tags: [...ticket.tags, tag] } : ticket,
          ),
        }));
      } catch (err) {
        set({
          ticketActionError: err instanceof ApiError ? err.message : "Impossible d'ajouter le tag.",
        });
      }
    },

    removeTicketTag: async (ticketId, tagId) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, tags: ticket.tags.filter((tag) => tag.id !== tagId) }
            : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await removeTicketTagRequest(ticketId, tagId);
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError: err instanceof ApiError ? err.message : 'Impossible de supprimer le tag.',
        });
      }
    },

    addTicketSubtask: async (ticketId, label) => {
      set({ ticketActionError: null });
      try {
        const apiSubtask = await addTicketSubtaskRequest(ticketId, label);
        const subtask = mapSubtask(apiSubtask);
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, subTasks: [...ticket.subTasks, subtask] } : ticket,
          ),
        }));
      } catch (err) {
        set({
          ticketActionError:
            err instanceof ApiError ? err.message : "Impossible d'ajouter la sous-tâche.",
        });
      }
    },

    toggleTicketSubtask: async (ticketId, subtaskId, done) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                subTasks: ticket.subTasks.map((task) =>
                  task.id === subtaskId ? { ...task, done } : task,
                ),
              }
            : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await updateTicketSubtask(ticketId, subtaskId, { done });
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de mettre à jour la sous-tâche.',
        });
      }
    },

    removeTicketSubtask: async (ticketId, subtaskId) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, subTasks: ticket.subTasks.filter((task) => task.id !== subtaskId) }
            : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await removeTicketSubtaskRequest(ticketId, subtaskId);
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de supprimer la sous-tâche.',
        });
      }
    },

    addTicketLink: async (ticketId, linkedTicketId) => {
      set({ ticketActionError: null });
      try {
        const apiLink = await addTicketLinkRequest(ticketId, linkedTicketId);
        const link = mapLinkedTicket(apiLink);
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, links: [...ticket.links, link] } : ticket,
          ),
        }));
      } catch (err) {
        set({
          ticketActionError: err instanceof ApiError ? err.message : 'Impossible de lier ce ticket.',
        });
      }
    },

    removeTicketLink: async (ticketId, linkedTicketId) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, links: ticket.links.filter((link) => link.id !== linkedTicketId) }
            : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await removeTicketLinkRequest(ticketId, linkedTicketId);
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de supprimer ce lien.',
        });
      }
    },

    setTicketCustomField: async (ticketId, key, value) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, customFields: { ...ticket.customFields, [key]: value } }
            : ticket,
        ),
        ticketActionError: null,
      }));

      try {
        await setTicketCustomFieldRequest(ticketId, key, value);
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : "Impossible d'ajouter ce champ.",
        });
      }
    },

    removeTicketCustomField: async (ticketId, key) => {
      const previous = get().tickets;
      set((state) => ({
        tickets: state.tickets.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;
          const remaining = Object.fromEntries(
            Object.entries(ticket.customFields).filter(([fieldKey]) => fieldKey !== key),
          );
          return { ...ticket, customFields: remaining };
        }),
        ticketActionError: null,
      }));

      try {
        await removeTicketCustomFieldRequest(ticketId, key);
      } catch (err) {
        set({
          tickets: previous,
          ticketActionError:
            err instanceof ApiError ? err.message : 'Impossible de supprimer ce champ.',
        });
      }
    },
  };
});
