import type { Person, Ticket, TicketPriority, TicketStatusCode, TicketTypeCode } from '@/types/ticket';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function makePerson(overrides: Partial<Person> = {}): Person {
  const id = overrides.id ?? nextId('person');
  return {
    id,
    name: 'Test User',
    initials: 'TU',
    email: 'test.user@example.com',
    avatarUrl: null,
    roleCode: 'admin',
    roleName: 'Admin',
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const id = overrides.id ?? nextId('ticket');
  return {
    id,
    reference: `T-${id}`,
    title: 'Ticket de test',
    description: '',
    statusId: 'status-new',
    status: 'NEW' as TicketStatusCode,
    statusName: 'Nouveau',
    statusIsTerminal: false,
    priority: 'medium' as TicketPriority,
    typeId: 'type-rfi',
    type: 'RFI' as TicketTypeCode,
    typeName: 'RFI',
    lot: null,
    trade: null,
    isBlocking: false,
    externalParty: null,
    costImpactAmount: null,
    scheduleImpactDays: null,
    project: { id: 'project-1', name: 'Chantier Test', code: 'CT1' },
    assignees: [],
    reporter: makePerson({ id: 'reporter-1' }),
    dueDate: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-01T00:00:00.000Z',
    lastActivityPreview: null,
    lastActivityAuthor: null,
    tags: [],
    watchersCount: 0,
    messages: [],
    statusHistory: [],
    subTasks: [],
    links: [],
    customFields: {},
    attachments: [],
    planId: null,
    planX: null,
    planY: null,
    planPage: null,
    planName: null,
    ...overrides,
  };
}
