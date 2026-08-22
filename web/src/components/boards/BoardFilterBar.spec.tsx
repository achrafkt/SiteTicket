import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Person, Project } from '@/types/ticket';
import { EMPTY_BOARD_FILTERS, type BoardFilters } from './board-types';
import { BoardFilterBar } from './BoardFilterBar';

const projects: Project[] = [
  { id: 'project-1', name: 'Chantier Nord', code: 'CN' },
  { id: 'project-2', name: 'Chantier Sud', code: 'CS' },
];

const users: Person[] = [
  { id: 'user-1', name: 'Alice', initials: 'AL', email: 'alice@example.com', avatarUrl: null, roleCode: 'moe', roleName: 'MOE' },
];

function renderBar(filters: BoardFilters, onChange = vi.fn()) {
  render(<BoardFilterBar filters={filters} onChange={onChange} projects={projects} users={users} />);
  return onChange;
}

describe('BoardFilterBar', () => {
  it('does not show the reset button when no filter is active', () => {
    renderBar(EMPTY_BOARD_FILTERS);
    expect(screen.queryByText('Réinitialiser')).not.toBeInTheDocument();
  });

  it('shows the reset button once any filter is active', () => {
    renderBar({ ...EMPTY_BOARD_FILTERS, blockingOnly: true });
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument();
  });

  it('selecting a project calls onChange with only the projectId updated', async () => {
    const user = userEvent.setup();
    const onChange = renderBar(EMPTY_BOARD_FILTERS);

    await user.click(screen.getByText('Tous les chantiers'));
    await user.click(screen.getByText('Chantier Sud'));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_BOARD_FILTERS, projectId: 'project-2' });
  });

  it('selecting an assignee calls onChange with only the assigneeId updated', async () => {
    const user = userEvent.setup();
    const onChange = renderBar(EMPTY_BOARD_FILTERS);

    await user.click(screen.getByText('Tous les assignés'));
    await user.click(screen.getByText('Alice'));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_BOARD_FILTERS, assigneeId: 'user-1' });
  });

  it('toggling "Bloquants uniquement" flips blockingOnly and reflects aria-pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBar(EMPTY_BOARD_FILTERS, onChange);

    const toggle = screen.getByRole('button', { name: /Bloquants uniquement/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_BOARD_FILTERS, blockingOnly: true });
  });

  it('clicking reset calls onChange with EMPTY_BOARD_FILTERS regardless of prior filters', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBar(
      { projectId: 'project-1', assigneeId: 'user-1', priority: 'high', blockingOnly: true },
      onChange,
    );

    await user.click(screen.getByText('Réinitialiser'));

    expect(onChange).toHaveBeenCalledWith(EMPTY_BOARD_FILTERS);
  });

  it('reflects the currently selected project as the dropdown label', () => {
    renderBar({ ...EMPTY_BOARD_FILTERS, projectId: 'project-1' });
    expect(screen.getByText('Chantier Nord')).toBeInTheDocument();
  });
});
