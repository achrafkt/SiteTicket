import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Person, Project, Ticket, TicketType } from '@/types/ticket';
import { makePerson } from '@/test-utils/fixtures';
import { useTicketStore } from '@/store/ticket-store';
import { CreateTicketPanel } from './CreateTicketPanel';

// CreateTicketPanel talks only to the Zustand store (not lib/api.ts directly),
// so the "mock the network layer" instruction is applied one level up: the
// store's async actions are stubbed here, the same way admin-api.spec.ts
// stubs apiFetch.

const projects: Project[] = [
  { id: 'project-1', name: 'Chantier Nord', code: 'CN' },
  { id: 'project-2', name: 'Chantier Sud', code: 'CS' },
];

const types: TicketType[] = [{ id: 'type-rfi', code: 'RFI', name: 'RFI', requiresApprovalChain: false }];

const users: Person[] = [makePerson({ id: 'user-1', name: 'Alice' })];

const currentUser = makePerson({ id: 'me', name: 'Moi' });

function setupStore(overrides: Partial<ReturnType<typeof useTicketStore.getState>> = {}) {
  const state = {
    types,
    projects,
    users,
    currentUser,
    createDraftTypeId: 'type-rfi',
    createDraftPlanPin: null,
    isCreatingTicket: false,
    createTicketError: null,
    closeCreateTicketPanel: vi.fn(),
    createTicket: vi.fn().mockResolvedValue(null),
    uploadTicketAttachment: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  useTicketStore.setState(state);

  return state;
}

beforeEach(() => {
  setupStore();
});

function fileOf(name: string, type: string, sizeBytes: number): File {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 1024))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('CreateTicketPanel', () => {
  it('shows the draft ticket type name in the header', () => {
    render(<CreateTicketPanel />);
    expect(screen.getByText('RFI')).toBeInTheDocument();
  });

  it('disables submit until a title and a project are set', async () => {
    const user = userEvent.setup();
    render(<CreateTicketPanel />);

    const submit = screen.getByRole('button', { name: 'Créer le ticket' });
    // A project is pre-selected (defaults to the first project), title is empty.
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), 'Fuite au sous-sol');
    expect(submit).toBeEnabled();
  });

  it('submits the trimmed form as a payload, with empty optional fields omitted', async () => {
    const user = userEvent.setup();
    const { createTicket } = setupStore();
    render(<CreateTicketPanel />);

    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), '  Fuite au sous-sol  ');
    await user.click(screen.getByRole('button', { name: 'Créer le ticket' }));

    expect(createTicket).toHaveBeenCalledTimes(1);
    const payload = createTicket.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: 'Fuite au sous-sol',
      projectId: 'project-1',
      priority: 'medium',
      description: undefined,
      locationZone: undefined,
      trade: undefined,
      dueDate: undefined,
      isBlocking: undefined,
      externalParty: undefined,
      costImpactAmount: undefined,
      scheduleImpactDays: undefined,
      assignedTo: undefined,
    });
  });

  it('includes numeric impact fields converted to numbers when provided', async () => {
    const user = userEvent.setup();
    const { createTicket } = setupStore();
    render(<CreateTicketPanel />);

    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), 'Titre');
    await user.type(screen.getAllByPlaceholderText('0')[0], '2500'); // cost impact is the first "0" placeholder
    await user.click(screen.getByRole('button', { name: 'Créer le ticket' }));

    const payload = createTicket.mock.calls[0][0];
    expect(payload.costImpactAmount).toBe(2500);
  });

  it('lets the current user assign the ticket to themselves', async () => {
    const user = userEvent.setup();
    const { createTicket } = setupStore();
    render(<CreateTicketPanel />);

    await user.click(screen.getByRole('button', { name: "M'assigner ce ticket" }));
    // The shortcut disappears once the ticket is already assigned to me.
    expect(screen.queryByRole('button', { name: "M'assigner ce ticket" })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), 'Titre');
    await user.click(screen.getByRole('button', { name: 'Créer le ticket' }));

    expect(createTicket.mock.calls[0][0].assignedTo).toBe('me');
  });

  it('rejects a file with a disallowed mime type and shows an error', () => {
    render(<CreateTicketPanel />);

    // userEvent.upload() filters candidate files against the input's `accept`
    // attribute before firing change, which would silently drop this file —
    // fireEvent bypasses that filtering to exercise the component's own check.
    const input = document.getElementById('create-ticket-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf('malware.exe', 'application/x-msdownload', 1024)] } });

    expect(screen.getByText('Types acceptés : images (JPEG, PNG, WebP) ou PDF.')).toBeInTheDocument();
    expect(screen.queryByText('malware.exe')).not.toBeInTheDocument();
  });

  it('rejects a file larger than 10MB and shows an error', async () => {
    const user = userEvent.setup();
    render(<CreateTicketPanel />);

    const input = document.getElementById('create-ticket-file-input') as HTMLInputElement;
    await user.upload(input, fileOf('huge.png', 'image/png', 11 * 1024 * 1024));

    expect(screen.getByText('Taille maximale : 10 Mo par fichier.')).toBeInTheDocument();
  });

  it('accepts a valid file and lists it as pending', async () => {
    const user = userEvent.setup();
    render(<CreateTicketPanel />);

    const input = document.getElementById('create-ticket-file-input') as HTMLInputElement;
    await user.upload(input, fileOf('photo.png', 'image/png', 2048));

    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('uploads pending attachments after a successful ticket creation', async () => {
    const user = userEvent.setup();
    const createdTicket = { id: 'new-ticket-1' } as Ticket;
    const { createTicket, uploadTicketAttachment } = setupStore({
      createTicket: vi.fn().mockResolvedValue(createdTicket),
    });
    render(<CreateTicketPanel />);

    const input = document.getElementById('create-ticket-file-input') as HTMLInputElement;
    await user.upload(input, fileOf('photo.png', 'image/png', 2048));
    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), 'Titre');
    await user.click(screen.getByRole('button', { name: 'Créer le ticket' }));

    expect(createTicket).toHaveBeenCalledTimes(1);
    expect(uploadTicketAttachment).toHaveBeenCalledTimes(1);
    expect(uploadTicketAttachment).toHaveBeenCalledWith('new-ticket-1', expect.any(File));
  });

  it('does not upload anything when ticket creation fails', async () => {
    const user = userEvent.setup();
    const { uploadTicketAttachment } = setupStore({ createTicket: vi.fn().mockResolvedValue(null) });
    render(<CreateTicketPanel />);

    const input = document.getElementById('create-ticket-file-input') as HTMLInputElement;
    await user.upload(input, fileOf('photo.png', 'image/png', 2048));
    await user.type(screen.getByPlaceholderText('Résumé court du ticket'), 'Titre');
    await user.click(screen.getByRole('button', { name: 'Créer le ticket' }));

    expect(uploadTicketAttachment).not.toHaveBeenCalled();
  });

  it('displays the store createTicketError when present', () => {
    setupStore({ createTicketError: 'Impossible de créer le ticket.' });
    render(<CreateTicketPanel />);
    expect(screen.getByText('Impossible de créer le ticket.')).toBeInTheDocument();
  });

  it('calls closeCreateTicketPanel when clicking "Annuler"', async () => {
    const user = userEvent.setup();
    const { closeCreateTicketPanel } = setupStore();
    render(<CreateTicketPanel />);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(closeCreateTicketPanel).toHaveBeenCalledTimes(1);
  });
});
