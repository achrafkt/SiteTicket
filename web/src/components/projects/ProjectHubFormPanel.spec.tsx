import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProjectHub } from '@/types/project-hub';
import { ApiError } from '@/lib/api';
import { createProjectHub, updateProjectHub } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import { ProjectHubFormPanel } from './ProjectHubFormPanel';

// The panel talks to lib/project-hub-api.ts (createProjectHub/updateProjectHub)
// and lib/project-hub-mapper.ts, so both are mocked here instead of hitting
// the network, mirroring how admin-api.spec.ts stubs apiFetch.
vi.mock('@/lib/project-hub-api', () => ({
  createProjectHub: vi.fn(),
  updateProjectHub: vi.fn(),
}));
vi.mock('@/lib/project-hub-mapper', () => ({
  mapProjectHub: vi.fn(),
}));

const mockedCreate = vi.mocked(createProjectHub);
const mockedUpdate = vi.mocked(updateProjectHub);
const mockedMap = vi.mocked(mapProjectHub);

const existingProject: ProjectHub = {
  id: 'project-1',
  name: 'Résidence Les Terrasses',
  code: 'RLT-AB12',
  address: '12 rue des Lilas',
  clientName: 'Ville de Casablanca',
  description: 'Construction de 40 logements',
  status: 'actif',
  progressPercent: 40,
  budgetPlanned: 2450000,
  budgetSpent: 900000,
  budgetVariance: null,
  startDate: '2026-01-15T00:00:00.000Z',
  endDatePlanned: '2026-12-31T00:00:00.000Z',
  endDateActual: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  taskCount: 3,
  memberCount: 5,
};

beforeEach(() => {
  mockedCreate.mockReset().mockResolvedValue({} as never);
  mockedUpdate.mockReset().mockResolvedValue({} as never);
  mockedMap.mockReset().mockReturnValue({ ...existingProject });
});

function renderPanel(project: ProjectHub | null, onSaved = vi.fn(), onClose = vi.fn()) {
  render(<ProjectHubFormPanel project={project} onClose={onClose} onSaved={onSaved} />);
  return { onSaved, onClose };
}

describe('ProjectHubFormPanel — create mode', () => {
  it('renders empty fields and the default "preparation" status', () => {
    renderPanel(null);
    expect(screen.getByText('Nouveau chantier')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ex : Résidence Les Terrasses')).toHaveValue('');
    expect(screen.getByText('En préparation')).toBeInTheDocument();
  });

  it('disables submit until a name is entered', async () => {
    const user = userEvent.setup();
    renderPanel(null);

    const submit = screen.getByRole('button', { name: 'Créer le chantier' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), 'Nouveau site');
    expect(submit).toBeEnabled();
  });

  it('submits a trimmed payload with a generated code, omitting empty optional fields', async () => {
    const user = userEvent.setup();
    renderPanel(null);

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), '  Nouveau site  ');
    await user.click(screen.getByRole('button', { name: 'Créer le chantier' }));

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    const [payload] = mockedCreate.mock.calls[0];
    expect(payload).toMatchObject({
      name: 'Nouveau site',
      address: undefined,
      clientName: undefined,
      description: undefined,
      status: 'preparation',
      budgetPlanned: undefined,
      startDate: undefined,
      endDatePlanned: undefined,
      endDateActual: undefined,
    });
    expect(payload.code).toMatch(/^NOUVEAU-SITE-[A-Z0-9]{4}$/);
  });

  it('parses the planned budget as a number when provided', async () => {
    const user = userEvent.setup();
    renderPanel(null);

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), 'Site');
    await user.type(screen.getByPlaceholderText('ex : 2450000'), '3000000');
    await user.click(screen.getByRole('button', { name: 'Créer le chantier' }));

    expect(mockedCreate.mock.calls[0][0].budgetPlanned).toBe(3000000);
  });

  it('calls onSaved with the mapped project after a successful create', async () => {
    const user = userEvent.setup();
    const { onSaved } = renderPanel(null);

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), 'Site');
    await user.click(screen.getByRole('button', { name: 'Créer le chantier' }));

    expect(onSaved).toHaveBeenCalledWith(existingProject);
  });
});

describe('ProjectHubFormPanel — edit mode', () => {
  it('pre-fills the form from the given project, including sliced dates', () => {
    renderPanel(existingProject);

    expect(screen.getByText('Modifier le chantier')).toBeInTheDocument();
    expect(screen.getByText('RLT-AB12')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ex : Résidence Les Terrasses')).toHaveValue('Résidence Les Terrasses');
    expect(screen.getByPlaceholderText('Adresse du chantier')).toHaveValue('12 rue des Lilas');
    expect(screen.getByPlaceholderText('ex : 2450000')).toHaveValue(2450000);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-01-15');
    expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-12-31');
    expect((dateInputs[2] as HTMLInputElement).value).toBe('');
  });

  it('submits an update to the existing project instead of creating a new one', async () => {
    const user = userEvent.setup();
    renderPanel(existingProject);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate.mock.calls[0][0]).toBe('project-1');
  });

  it('keeps submit enabled since the project already has a name', () => {
    renderPanel(existingProject);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  });
});

describe('ProjectHubFormPanel — error handling', () => {
  it('shows the ApiError message when the save fails', async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new ApiError('Code déjà utilisé.', 409));
    renderPanel(null);

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), 'Site');
    await user.click(screen.getByRole('button', { name: 'Créer le chantier' }));

    expect(await screen.findByText('Code déjà utilisé.')).toBeInTheDocument();
  });

  it('shows a generic message for a non-ApiError failure', async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new Error('network down'));
    renderPanel(null);

    await user.type(screen.getByPlaceholderText('ex : Résidence Les Terrasses'), 'Site');
    await user.click(screen.getByRole('button', { name: 'Créer le chantier' }));

    expect(await screen.findByText('Impossible d’enregistrer le chantier.')).toBeInTheDocument();
  });
});

describe('ProjectHubFormPanel — closing', () => {
  it('calls onClose when clicking the close (X) button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel(null);

    await user.click(document.querySelector('svg.lucide-x')!.closest('button')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking "Annuler"', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel(null);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop, but not when clicking inside the panel', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel(null);

    await user.click(screen.getByText('Nouveau chantier'));
    expect(onClose).not.toHaveBeenCalled();

    // The backdrop is the outer fixed-position overlay behind the panel.
    await user.click(document.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
