import { describe, expect, it } from 'vitest';
import { isValidCalendarDate } from './calendar-date.js';

describe('calendar-date validation', () => {
  it.each(['2026-10-08', '2000-02-29', '2026-01-01'])('accepts a real date: %s', (value) => {
    expect(isValidCalendarDate(value)).toBe(true);
  });

  it.each(['1900-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00'])(
    'rejects an impossible date: %s',
    (value) => {
      expect(isValidCalendarDate(value)).toBe(false);
    },
  );

  it.each(['2026-1-08', '2026-01-8', '2026-10-08T00:00:00Z', '08/10/2026', ''])(
    'rejects a value outside the YYYY-MM-DD contract: %s',
    (value) => {
      expect(isValidCalendarDate(value)).toBe(false);
    },
  );
});
