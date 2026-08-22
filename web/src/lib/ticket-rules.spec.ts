import { describe, expect, it } from 'vitest';
import { getActualDelayDays, getDueDateUrgency, isTicketOverdue } from './ticket-rules';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('getDueDateUrgency', () => {
  it('returns "none" when there is no due date', () => {
    expect(getDueDateUrgency(null, false, NOW)).toBe('none');
  });

  it('returns "normal" for a terminal ticket even if its due date is in the past', () => {
    expect(getDueDateUrgency('2026-01-01', true, NOW)).toBe('normal');
  });

  it('returns "overdue" when the due date has passed', () => {
    expect(getDueDateUrgency('2026-06-10', false, NOW)).toBe('overdue');
  });

  it('returns "soon" when the due date is within the 48h threshold', () => {
    expect(getDueDateUrgency('2026-06-16', false, NOW)).toBe('soon');
  });

  it('returns "normal" when the due date is comfortably in the future', () => {
    expect(getDueDateUrgency('2026-07-01', false, NOW)).toBe('normal');
  });
});

describe('isTicketOverdue', () => {
  it('is true only when urgency resolves to "overdue"', () => {
    expect(isTicketOverdue('2026-06-10', false, NOW)).toBe(true);
    expect(isTicketOverdue('2026-07-01', false, NOW)).toBe(false);
    expect(isTicketOverdue(null, false, NOW)).toBe(false);
  });
});

describe('getActualDelayDays', () => {
  it('returns null when there is no due date or no resolution date', () => {
    expect(getActualDelayDays(null, '2026-06-15')).toBeNull();
    expect(getActualDelayDays('2026-06-15', null)).toBeNull();
  });

  it('returns a positive count of days when resolved after the due date', () => {
    expect(getActualDelayDays('2026-06-10', '2026-06-13T10:00:00.000Z')).toBe(3);
  });

  it('returns zero or negative when resolved on time or early', () => {
    expect(getActualDelayDays('2026-06-15', '2026-06-15T10:00:00.000Z')).toBeLessThanOrEqual(0);
    expect(getActualDelayDays('2026-06-15', '2026-06-10T10:00:00.000Z')).toBeLessThan(0);
  });
});
