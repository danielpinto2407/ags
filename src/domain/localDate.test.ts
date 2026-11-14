import { describe, expect, it } from 'vitest';
import { shiftUtcDate, utcDateInputValue, utcWeekInputValues } from '@/domain/localDate';

describe('UTC execution date', () => {
  it('uses the UTC calendar day for routine selection and execution', () => {
    expect(utcDateInputValue(new Date('2026-11-14T03:00:00.000Z'))).toBe('2026-11-14');
  });

  it('builds a Monday-to-Sunday UTC week across month boundaries', () => {
    expect(utcWeekInputValues('2026-11-14')).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12',
      '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
    expect(shiftUtcDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});