import { toLocalDateString, formatHumanDate } from './date';

describe('toLocalDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toLocalDateString(new Date(2026, 8, 6))).toBe('2026-09-06');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the LOCAL calendar day, not a UTC-shifted one, late in the evening', () => {
    // The bug this function exists to prevent: `date.toISOString()`
    // always reports the UTC date, which rolls over to the next
    // calendar day in the evening for any timezone west of UTC. A
    // Date constructed from explicit (year, month, day, hour) local
    // components at 11pm should still report that same local day.
    const lateEvening = new Date(2026, 8, 6, 23, 30);
    expect(toLocalDateString(lateEvening)).toBe('2026-09-06');
  });
});

describe('formatHumanDate', () => {
  it('formats a date in the current year without showing the year', () => {
    const currentYear = new Date().getFullYear();
    const result = formatHumanDate(`${currentYear}-09-06`);
    expect(result).not.toContain(String(currentYear));
    expect(result).toMatch(/^\w{3}, Sep 6$/);
  });

  it('includes the year when the date is not in the current year', () => {
    const result = formatHumanDate('2020-03-15');
    expect(result).toContain('2020');
    expect(result).toMatch(/^\w{3}, Mar 15, 2020$/);
  });

  it('parses the date components by hand rather than via new Date(isoDate) directly', () => {
    // A bare 'YYYY-MM-DD' string parses as UTC midnight per the JS
    // spec -- passed straight to `new Date(...)`, this would shift the
    // displayed date back by a day for anyone west of UTC. Testing the
    // first and last day of a month specifically, since a UTC-rollover
    // bug would show up as an off-by-one day here.
    expect(formatHumanDate('2026-09-01')).toMatch(/Sep 1$/);
    expect(formatHumanDate('2026-09-30')).toMatch(/Sep 30$/);
  });
});
