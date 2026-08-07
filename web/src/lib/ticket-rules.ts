import type { TicketStatusCode } from '@/types/ticket';

export type DueDateUrgency = 'overdue' | 'soon' | 'normal' | 'none';

const SOON_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Computes how urgent a ticket's due date is, relative to `now`.
 * A ticket that is already `done` is never considered overdue/soon.
 */
export function getDueDateUrgency(
  dueDate: string | null,
  status: TicketStatusCode,
  now: Date = new Date(),
): DueDateUrgency {
  if (!dueDate) return 'none';
  if (status === 'done') return 'normal';

  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999); // due date covers the whole day

  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return 'overdue';
  if (diffMs <= SOON_THRESHOLD_MS) return 'soon';
  return 'normal';
}

export function isTicketOverdue(
  dueDate: string | null,
  status: TicketStatusCode,
  now?: Date,
): boolean {
  return getDueDateUrgency(dueDate, status, now) === 'overdue';
}
