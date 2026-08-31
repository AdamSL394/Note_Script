/**
 * Formats a date as YYYY-MM-DD using the date's LOCAL calendar day,
 * not UTC. `date.toISOString().split('T')[0]` -- used throughout this
 * app before this fix -- always returns the UTC date, which silently
 * rolls over to the next calendar day in the evening for any timezone
 * west of UTC (every US timezone, for instance). At 9pm Eastern,
 * UTC has already reached 1am the next day; "today" was actually
 * computing as tomorrow.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD string as "Mon, Aug 24" (or "Mon, Aug 24, 2024"
 * when the year differs from the current one). Deliberately parses the
 * components by hand rather than `new Date(isoDate)` -- a bare
 * YYYY-MM-DD string parses as UTC midnight per the JS spec, which is
 * exactly the class of bug just fixed elsewhere in this app: it would
 * silently shift the displayed date back by a day for anyone west of
 * UTC. Constructing via the (year, month, day) numeric form is always
 * interpreted in local time, avoiding that pitfall entirely.
 */
export function formatHumanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return isCurrentYear
    ? `${weekday}, ${monthName} ${date.getDate()}`
    : `${weekday}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
}
