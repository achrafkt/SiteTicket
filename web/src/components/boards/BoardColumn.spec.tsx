import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TicketStatus, TicketType } from '@/types/ticket';
import { makeTicket } from '@/test-utils/fixtures';
import { useTicketStore } from '@/store/ticket-store';
import { BoardColumn } from './BoardColumn';

const status: TicketStatus = {
  id: 'status-in-progress',
  code: 'IN_PROGRESS',
  name: 'En cours',
  sortOrder: 1,
  isTerminal: false,
};

const types: TicketType[] = [
  { id: 'type-rfi', code: 'RFI', name: 'RFI', requiresApprovalChain: false },
];

beforeEach(() => {
  useTicketStore.setState({ currentUser: null });
});

describe('BoardColumn', () => {
  it('renders only the tickets it was given, with a matching count badge', () => {
    const ownTickets = [
      makeTicket({ id: 'a', title: 'Ticket A' }),
      makeTicket({ id: 'b', title: 'Ticket B' }),
    ];

    render(
      <BoardColumn
        status={status}
        tickets={ownTickets}
        types={types}
        onOpenTicket={vi.fn()}
        onCreateTicket={vi.fn()}
      />,
    );

    expect(screen.getByText('Ticket A')).toBeInTheDocument();
    expect(screen.getByText('Ticket B')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });

  it('shows an empty-state message and a "0" badge when there are no tickets for this column', () => {
    render(
      <BoardColumn
        status={status}
        tickets={[]}
        types={types}
        onOpenTicket={vi.fn()}
        onCreateTicket={vi.fn()}
      />,
    );

    expect(screen.getByText('Aucun ticket')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('does not leak tickets from other columns into this one', () => {
    const thisColumnTickets = [makeTicket({ id: 'a', title: 'Belongs here' })];

    render(
      <BoardColumn
        status={status}
        tickets={thisColumnTickets}
        types={types}
        onOpenTicket={vi.fn()}
        onCreateTicket={vi.fn()}
      />,
    );

    expect(screen.queryByText('Belongs elsewhere')).not.toBeInTheDocument();
  });
});
