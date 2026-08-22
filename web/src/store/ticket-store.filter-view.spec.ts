import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePerson, makeTicket } from '@/test-utils/fixtures';
import { filterTicketsByView } from './ticket-store';

// isTicketOverdue (used by filterTicketsByView) compares against the real
// clock, so pin it for the whole file to keep the fixture dates meaningful.
const NOW = new Date('2026-06-15T12:00:00.000Z');
const me = makePerson({ id: 'me' });
const someoneElse = makePerson({ id: 'someone-else' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('filterTicketsByView', () => {
  it('all_tickets returns every ticket unchanged', () => {
    const tickets = [makeTicket(), makeTicket()];
    expect(filterTicketsByView(tickets, 'all_tickets', me.id)).toEqual(tickets);
  });

  it('my_tickets keeps only tickets the current user is assigned to', () => {
    const mine = makeTicket({ assignees: [me] });
    const notMine = makeTicket({ assignees: [someoneElse] });
    expect(filterTicketsByView([mine, notMine], 'my_tickets', me.id)).toEqual([mine]);
  });

  it('past_due keeps only overdue, non-terminal tickets', () => {
    const overdue = makeTicket({ dueDate: '2026-06-01', statusIsTerminal: false });
    const notOverdue = makeTicket({ dueDate: '2026-07-01', statusIsTerminal: false });
    const overdueButClosed = makeTicket({ dueDate: '2026-06-01', statusIsTerminal: true });
    const result = filterTicketsByView([overdue, notOverdue, overdueButClosed], 'past_due', me.id);
    expect(result).toEqual([overdue]);
  });

  it('high_priority keeps only high and critical tickets', () => {
    const high = makeTicket({ priority: 'high' });
    const critical = makeTicket({ priority: 'critical' });
    const medium = makeTicket({ priority: 'medium' });
    const result = filterTicketsByView([high, critical, medium], 'high_priority', me.id);
    expect(result).toEqual([high, critical]);
  });

  it('unassigned keeps only tickets with no assignees', () => {
    const unassigned = makeTicket({ assignees: [] });
    const assigned = makeTicket({ assignees: [someoneElse] });
    expect(filterTicketsByView([unassigned, assigned], 'unassigned', me.id)).toEqual([unassigned]);
  });

  it('my_reserves_to_lift keeps only non-terminal PUNCH tickets assigned to me', () => {
    const matching = makeTicket({ type: 'PUNCH', assignees: [me], statusIsTerminal: false });
    const wrongType = makeTicket({ type: 'RFI', assignees: [me], statusIsTerminal: false });
    const notMine = makeTicket({ type: 'PUNCH', assignees: [someoneElse], statusIsTerminal: false });
    const terminal = makeTicket({ type: 'PUNCH', assignees: [me], statusIsTerminal: true });
    const result = filterTicketsByView([matching, wrongType, notMine, terminal], 'my_reserves_to_lift', me.id);
    expect(result).toEqual([matching]);
  });

  it('rfi_waiting_moe keeps only PENDING RFI tickets', () => {
    const matching = makeTicket({ type: 'RFI', status: 'PENDING' });
    const wrongType = makeTicket({ type: 'PUNCH', status: 'PENDING' });
    const wrongStatus = makeTicket({ type: 'RFI', status: 'NEW' });
    const result = filterTicketsByView([matching, wrongType, wrongStatus], 'rfi_waiting_moe', me.id);
    expect(result).toEqual([matching]);
  });

  it('overdue_by_lot keeps only overdue tickets, sorted by lot', () => {
    const lotB = makeTicket({ dueDate: '2026-06-01', statusIsTerminal: false, lot: 'Lot B' });
    const lotA = makeTicket({ dueDate: '2026-06-01', statusIsTerminal: false, lot: 'Lot A' });
    const notOverdue = makeTicket({ dueDate: '2026-07-01', statusIsTerminal: false, lot: 'Lot C' });
    const result = filterTicketsByView([lotB, lotA, notOverdue], 'overdue_by_lot', me.id);
    expect(result).toEqual([lotA, lotB]);
  });
});
