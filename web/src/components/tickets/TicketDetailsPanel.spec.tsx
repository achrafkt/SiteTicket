import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Person, Ticket, TicketStatus } from '@/types/ticket';
import { makePerson, makeTicket } from '@/test-utils/fixtures';
import { useTicketStore } from '@/store/ticket-store';
import { TicketDetailsPanel } from './TicketDetailsPanel';

// TicketDetailsPanel talks only to the Zustand store (not lib/api.ts directly),
// so its async actions are stubbed here rather than mocking a network layer,
// the same approach used in CreateTicketPanel.spec.tsx.

const statuses: TicketStatus[] = [
  { id: 'status-new', code: 'NEW', name: 'Nouveau', sortOrder: 0, isTerminal: false },
  { id: 'status-in-progress', code: 'IN_PROGRESS', name: 'En cours', sortOrder: 1, isTerminal: false },
  { id: 'status-resolved', code: 'RESOLVED', name: 'Résolu', sortOrder: 2, isTerminal: true },
];

const admin = makePerson({ id: 'admin-1', name: 'Admin User', roleCode: 'admin' });
const users: Person[] = [admin, makePerson({ id: 'user-2', name: 'Bob', roleCode: 'moe' })];

function setupStore(overrides: Partial<ReturnType<typeof useTicketStore.getState>> = {}) {
  const state = {
    statuses,
    users,
    currentUser: admin,
    updateTicketStatus: vi.fn(),
    updateTicketPriority: vi.fn(),
    assignTicketToUser: vi.fn(),
    deleteTicketAttachment: vi.fn(),
    toggleDetailsPanel: vi.fn(),
    detailLoadingId: null,
    detailError: null,
    ticketActionError: null,
    addTicketTag: vi.fn(),
    removeTicketTag: vi.fn(),
    addTicketSubtask: vi.fn(),
    toggleTicketSubtask: vi.fn(),
    removeTicketSubtask: vi.fn(),
    setTicketCustomField: vi.fn(),
    removeTicketCustomField: vi.fn(),
    addTicketLink: vi.fn(),
    removeTicketLink: vi.fn(),
    setActiveTicketId: vi.fn(),
    updateTicketImpact: vi.fn(),
    setTicketPlanPin: vi.fn(),
    removeTicketPlanPin: vi.fn(),
    tickets: [] as Ticket[],
    ...overrides,
  };

  useTicketStore.setState(state);
  return state;
}

beforeEach(() => {
  setupStore();
});

describe('TicketDetailsPanel — status & priority', () => {
  it('changing the status dropdown calls updateTicketStatus', async () => {
    const user = userEvent.setup();
    const { updateTicketStatus } = setupStore();
    const ticket = makeTicket({ statusId: 'status-new', status: 'NEW', reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByText('Nouveau'));
    await user.click(screen.getByText('En cours'));

    expect(updateTicketStatus).toHaveBeenCalledWith(ticket.id, 'status-in-progress');
  });

  it('changing the priority dropdown calls updateTicketPriority', async () => {
    const user = userEvent.setup();
    const { updateTicketPriority } = setupStore();
    const ticket = makeTicket({ priority: 'medium', reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByText('Moyenne'));
    await user.click(screen.getByText('Haute'));

    expect(updateTicketPriority).toHaveBeenCalledWith(ticket.id, 'high');
  });

  it('disables status and priority dropdowns when the role cannot modify the ticket', () => {
    setupStore({ currentUser: makePerson({ id: 'moa-1', roleCode: 'moa' }) });
    const ticket = makeTicket({ reporter: makePerson({ id: 'someone-else' }) });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.getByText(ticket.statusName).closest('button')).toBeDisabled();
    expect(screen.getByText('Moyenne').closest('button')).toBeDisabled();
  });

  it('qse can modify a SAFETY ticket but not a regular one (ticket_type_safety scope)', () => {
    const qse = makePerson({ id: 'qse-1', roleCode: 'qse' });
    setupStore({ currentUser: qse });

    const safetyTicket = makeTicket({ type: 'SAFETY', reporter: makePerson({ id: 'someone-else' }) });
    const { unmount } = render(<TicketDetailsPanel ticket={safetyTicket} />);
    expect(screen.getByText(safetyTicket.statusName).closest('button')).toBeEnabled();
    unmount();

    const rfiTicket = makeTicket({ type: 'RFI', reporter: makePerson({ id: 'someone-else' }) });
    render(<TicketDetailsPanel ticket={rfiTicket} />);
    expect(screen.getByText(rfiTicket.statusName).closest('button')).toBeDisabled();
  });

  it('clicking the close button toggles the details panel closed', async () => {
    const user = userEvent.setup();
    const { toggleDetailsPanel } = setupStore();
    render(<TicketDetailsPanel ticket={makeTicket({ reporter: admin })} />);

    await user.click(document.querySelector('svg.lucide-x')!.closest('button')!);
    expect(toggleDetailsPanel).toHaveBeenCalledWith(false);
  });
});

describe('TicketDetailsPanel — assignment', () => {
  it('shows "Assigner à moi" and assigns the ticket to the current user when clicked', async () => {
    const user = userEvent.setup();
    const { assignTicketToUser } = setupStore();
    const ticket = makeTicket({ assignees: [], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    const button = screen.getByRole('button', { name: 'Assigner à moi' });
    await user.click(button);

    expect(assignTicketToUser).toHaveBeenCalledWith(ticket.id, admin.id);
  });

  it('hides "Assigner à moi" once the ticket is already assigned to the current user', () => {
    setupStore();
    const ticket = makeTicket({ assignees: [admin], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.queryByRole('button', { name: 'Assigner à moi' })).not.toBeInTheDocument();
  });

  it('selecting a user from the assignee dropdown calls assignTicketToUser', async () => {
    const user = userEvent.setup();
    const { assignTicketToUser } = setupStore();
    const ticket = makeTicket({ assignees: [], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByText('Non assigné'));
    await user.click(screen.getByText('Bob'));

    expect(assignTicketToUser).toHaveBeenCalledWith(ticket.id, 'user-2');
  });

  it('unassigning via the dropdown calls assignTicketToUser with null', async () => {
    const user = userEvent.setup();
    const { assignTicketToUser } = setupStore();
    const bob = users[1];
    const ticket = makeTicket({ assignees: [bob], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByText('Bob'));
    await user.click(screen.getByText('Non assigné'));

    expect(assignTicketToUser).toHaveBeenCalledWith(ticket.id, null);
  });

  it('disables the assignee dropdown when the role cannot assign', () => {
    setupStore({ currentUser: makePerson({ id: 'sub-1', roleCode: 'sous_traitant' }) });
    const ticket = makeTicket({ assignees: [], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.getByText('Non assigné').closest('button')).toBeDisabled();
  });
});

describe('TicketDetailsPanel — due date and resolution delay', () => {
  it('shows a late-resolution message with the correct day count', () => {
    setupStore();
    const ticket = makeTicket({
      dueDate: '2026-06-10',
      resolvedAt: '2026-06-13T10:00:00.000Z',
      closedAt: null,
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.getByText(/Retard réel : 3 j/)).toBeInTheDocument();
  });

  it('shows an on-time message when resolved before or on the due date', () => {
    setupStore();
    const ticket = makeTicket({
      dueDate: '2026-06-15',
      resolvedAt: '2026-06-10T10:00:00.000Z',
      closedAt: null,
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.getByText(/Traité dans les délais/)).toBeInTheDocument();
  });

  it('shows no delay message when the ticket has not been resolved yet', () => {
    setupStore();
    const ticket = makeTicket({ dueDate: '2026-06-15', resolvedAt: null, closedAt: null, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.queryByText(/Retard réel/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Traité dans les délais/)).not.toBeInTheDocument();
  });
});

describe('TicketDetailsPanel — impact fields', () => {
  it('toggling "Ticket bloquant" calls updateTicketImpact with isBlocking', async () => {
    const user = userEvent.setup();
    const { updateTicketImpact } = setupStore();
    const ticket = makeTicket({ isBlocking: false, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByLabelText('Ticket bloquant'));

    expect(updateTicketImpact).toHaveBeenCalledWith(ticket.id, { isBlocking: true });
  });

  it('blurring the cost impact input with a value calls updateTicketImpact with a number', async () => {
    const user = userEvent.setup();
    const { updateTicketImpact } = setupStore();
    const ticket = makeTicket({ costImpactAmount: null, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    const input = screen.getAllByPlaceholderText('0')[0];
    await user.type(input, '1500');
    await user.tab();

    expect(updateTicketImpact).toHaveBeenCalledWith(ticket.id, { costImpactAmount: 1500 });
  });

  it('blurring the cost impact input empty calls updateTicketImpact with null', async () => {
    const user = userEvent.setup();
    const { updateTicketImpact } = setupStore();
    const ticket = makeTicket({ costImpactAmount: 500, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    const input = screen.getAllByPlaceholderText('0')[0];
    await user.clear(input);
    await user.tab();

    expect(updateTicketImpact).toHaveBeenCalledWith(ticket.id, { costImpactAmount: null });
  });
});

describe('TicketDetailsPanel — tags', () => {
  it('adding a tag calls addTicketTag with the trimmed value', async () => {
    const user = userEvent.setup();
    const { addTicketTag } = setupStore();
    const ticket = makeTicket({ tags: [], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByRole('button', { name: /Ajouter un tag/ }));
    await user.type(screen.getByPlaceholderText('Nom du tag'), '  urgent  {Enter}');

    expect(addTicketTag).toHaveBeenCalledWith(ticket.id, 'urgent');
  });

  it('does not add a tag whose label already exists on the ticket', async () => {
    const user = userEvent.setup();
    const { addTicketTag } = setupStore();
    const ticket = makeTicket({ tags: [{ id: 'tag-1', label: 'urgent' }], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByRole('button', { name: /Ajouter un tag/ }));
    await user.type(screen.getByPlaceholderText('Nom du tag'), 'urgent{Enter}');

    expect(addTicketTag).not.toHaveBeenCalled();
  });

  it('removing a tag calls removeTicketTag when the role can modify the ticket', async () => {
    const user = userEvent.setup();
    const { removeTicketTag } = setupStore();
    const ticket = makeTicket({ tags: [{ id: 'tag-1', label: 'urgent' }], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await user.click(screen.getByTitle('Supprimer urgent'));

    expect(removeTicketTag).toHaveBeenCalledWith(ticket.id, 'tag-1');
  });

  it('hides the tag remove control when the role cannot modify the ticket', () => {
    setupStore({ currentUser: makePerson({ id: 'moa-1', roleCode: 'moa' }) });
    const ticket = makeTicket({
      tags: [{ id: 'tag-1', label: 'urgent' }],
      reporter: makePerson({ id: 'someone-else' }),
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    expect(screen.queryByTitle('Supprimer urgent')).not.toBeInTheDocument();
  });
});

describe('TicketDetailsPanel — subtasks', () => {
  async function openSubtasksSection(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Tâches/ }));
  }

  it('shows the empty state and lets a permitted user add a subtask', async () => {
    const user = userEvent.setup();
    const { addTicketSubtask } = setupStore();
    const ticket = makeTicket({ subTasks: [], reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openSubtasksSection(user);
    expect(screen.getByText('Aucune sous-tâche.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ajouter une tâche/ }));
    await user.type(screen.getByPlaceholderText('Nouvelle tâche'), 'Vérifier le câblage{Enter}');

    expect(addTicketSubtask).toHaveBeenCalledWith(ticket.id, 'Vérifier le câblage');
  });

  it('toggling a subtask checkbox calls toggleTicketSubtask', async () => {
    const user = userEvent.setup();
    const { toggleTicketSubtask } = setupStore();
    const ticket = makeTicket({
      subTasks: [{ id: 'sub-1', label: 'Vérifier le câblage', done: false }],
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openSubtasksSection(user);
    // The "Ticket bloquant" checkbox in the always-visible impact section
    // renders first in DOM order, so the subtask checkbox is the second one.
    await user.click(screen.getAllByRole('checkbox')[1]);

    expect(toggleTicketSubtask).toHaveBeenCalledWith(ticket.id, 'sub-1', true);
  });

  it('removing a subtask calls removeTicketSubtask', async () => {
    const user = userEvent.setup();
    const { removeTicketSubtask } = setupStore();
    const ticket = makeTicket({
      subTasks: [{ id: 'sub-1', label: 'Vérifier le câblage', done: false }],
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openSubtasksSection(user);
    await user.click(screen.getByTitle('Supprimer la sous-tâche'));

    expect(removeTicketSubtask).toHaveBeenCalledWith(ticket.id, 'sub-1');
  });
});

describe('TicketDetailsPanel — custom fields', () => {
  async function openCustomFieldsSection(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Champs collectés/ }));
  }

  it('adding a custom field with a key and a value calls setTicketCustomField', async () => {
    const user = userEvent.setup();
    const { setTicketCustomField } = setupStore();
    const ticket = makeTicket({ customFields: {}, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openCustomFieldsSection(user);
    await user.click(screen.getByRole('button', { name: /Ajouter un champ/ }));
    await user.type(screen.getByPlaceholderText('Nom du champ'), 'Référence permis');
    await user.type(screen.getByPlaceholderText('Valeur'), 'PC-2026-042');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(setTicketCustomField).toHaveBeenCalledWith(ticket.id, 'Référence permis', 'PC-2026-042');
  });

  it('does not submit a custom field missing a key or a value', async () => {
    const user = userEvent.setup();
    const { setTicketCustomField } = setupStore();
    const ticket = makeTicket({ customFields: {}, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openCustomFieldsSection(user);
    await user.click(screen.getByRole('button', { name: /Ajouter un champ/ }));
    await user.type(screen.getByPlaceholderText('Valeur'), 'PC-2026-042');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(setTicketCustomField).not.toHaveBeenCalled();
  });

  it('removing a custom field calls removeTicketCustomField', async () => {
    const user = userEvent.setup();
    const { removeTicketCustomField } = setupStore();
    const ticket = makeTicket({ customFields: { 'Référence permis': 'PC-2026-042' }, reporter: admin });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openCustomFieldsSection(user);
    await user.click(screen.getByTitle('Supprimer ce champ'));

    expect(removeTicketCustomField).toHaveBeenCalledWith(ticket.id, 'Référence permis');
  });
});

describe('TicketDetailsPanel — attachments', () => {
  async function openAttachmentsSection(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Pièces jointes/ }));
  }

  it('allows removing an attachment uploaded by the current user, calling deleteTicketAttachment', async () => {
    const user = userEvent.setup();
    const { deleteTicketAttachment } = setupStore();
    const ticket = makeTicket({
      attachments: [
        {
          id: 'att-1',
          fileUrl: 'http://example.com/a.png',
          fileName: 'a.png',
          fileType: 'image/png',
          fileSize: 1024,
          uploadedAt: '2026-01-01T00:00:00.000Z',
          uploadedBy: admin,
        },
      ],
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openAttachmentsSection(user);
    await user.click(screen.getByTitle('Retirer'));

    expect(deleteTicketAttachment).toHaveBeenCalledWith(ticket.id, 'att-1');
  });

  it('disables removal of an attachment uploaded by someone else, per canDeleteAttachment', async () => {
    const user = userEvent.setup();
    setupStore({ currentUser: makePerson({ id: 'sub-1', roleCode: 'sous_traitant' }) });
    const ticket = makeTicket({
      attachments: [
        {
          id: 'att-1',
          fileUrl: 'http://example.com/a.png',
          fileName: 'a.png',
          fileType: 'image/png',
          fileSize: 1024,
          uploadedAt: '2026-01-01T00:00:00.000Z',
          uploadedBy: makePerson({ id: 'someone-else' }),
        },
      ],
      reporter: admin,
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openAttachmentsSection(user);
    expect(
      screen.getByTitle('Votre rôle ne permet pas de supprimer cette pièce jointe.'),
    ).toBeDisabled();
  });
});

describe('TicketDetailsPanel — history', () => {
  async function openHistorySection(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Historique/ }));
  }

  it('shows a loading indicator while the detail is loading', async () => {
    const user = userEvent.setup();
    const ticket = makeTicket({ reporter: admin });
    setupStore({ detailLoadingId: ticket.id });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openHistorySection(user);
    expect(screen.getByText(/Chargement de l'historique/)).toBeInTheDocument();
  });

  it('shows the detail error message when loading failed', async () => {
    const user = userEvent.setup();
    setupStore({ detailError: 'Impossible de charger le ticket.' });
    render(<TicketDetailsPanel ticket={makeTicket({ reporter: admin })} />);

    await openHistorySection(user);
    expect(screen.getByText('Impossible de charger le ticket.')).toBeInTheDocument();
  });

  it('renders status history entries', async () => {
    const user = userEvent.setup();
    setupStore();
    const ticket = makeTicket({
      reporter: admin,
      statusHistory: [
        {
          id: 'hist-1',
          fromStatusCode: 'NEW',
          fromStatusName: 'Nouveau',
          toStatusCode: 'IN_PROGRESS',
          toStatusName: 'En cours',
          changedBy: 'Bob Reviewer',
          changedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    render(<TicketDetailsPanel ticket={ticket} />);

    await openHistorySection(user);
    expect(screen.getByText(/En cours/)).toBeInTheDocument();
    expect(screen.getByText('Bob Reviewer', { exact: false })).toBeInTheDocument();
  });
});
