export type DueDateUrgency = 'overdue' | 'soon' | 'normal' | 'none';

const SOON_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Computes how urgent a ticket's due date is, relative to `now`.
 * A ticket whose status is terminal (resolved/closed) is never overdue/soon.
 */
export function getDueDateUrgency(
  dueDate: string | null,
  statusIsTerminal: boolean,
  now: Date = new Date(),
): DueDateUrgency {
  if (!dueDate) return 'none';
  if (statusIsTerminal) return 'normal';

  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999); // due date covers the whole day

  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return 'overdue';
  if (diffMs <= SOON_THRESHOLD_MS) return 'soon';
  return 'normal';
}

export function isTicketOverdue(
  dueDate: string | null,
  statusIsTerminal: boolean,
  now?: Date,
): boolean {
  return getDueDateUrgency(dueDate, statusIsTerminal, now) === 'overdue';
}
