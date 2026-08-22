import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatFileSize,
  formatShortDate,
  initialsAvatarColor,
} from './ticket-visuals';

describe('formatShortDate', () => {
  it('returns an em dash placeholder for a null date', () => {
    expect(formatShortDate(null)).toBe('—');
  });

  it('formats a date as "day month" in French, short form', () => {
    // Noon UTC keeps the local calendar day stable across any real-world timezone.
    expect(formatShortDate('2026-06-15T12:00:00.000Z')).toBe('15 juin');
  });
});

describe('formatDateTime', () => {
  it('formats a date with day, month and time', () => {
    const result = formatDateTime('2026-06-15T12:00:00.000Z');
    expect(result).toContain('juin');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatFileSize', () => {
  it('formats sub-kilobyte sizes in octets', () => {
    expect(formatFileSize(512)).toBe('512 o');
    expect(formatFileSize(0)).toBe('0 o');
  });

  it('formats sizes at or above 1024 bytes in kilo-octets', () => {
    expect(formatFileSize(1024)).toBe('1 Ko');
    expect(formatFileSize(2048)).toBe('2 Ko');
    expect(formatFileSize(1536)).toBe('2 Ko');
  });

  it('formats sizes at or above 1MB in mega-octets with one decimal', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 Mo');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 Mo');
  });
});

describe('initialsAvatarColor', () => {
  it('is deterministic for the same initials', () => {
    expect(initialsAvatarColor('AB')).toBe(initialsAvatarColor('AB'));
  });

  it('returns a Tailwind background class', () => {
    expect(initialsAvatarColor('AB')).toMatch(/^bg-\w+-\d+$/);
  });

  it('picks the color based on the first character code', () => {
    // 'A'.charCodeAt(0) === 65, palette has 6 entries -> index 65 % 6 === 5
    expect(initialsAvatarColor('A')).toBe('bg-emerald-600');
    // 'B'.charCodeAt(0) === 66 -> index 0
    expect(initialsAvatarColor('B')).toBe('bg-blue-600');
  });
});
