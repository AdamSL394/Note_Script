/**
 * Renders a note's star rating ('1'/'2'/'3'/'None', per the schema) as
 * filled/empty stars, or null for anything not a valid 1-3 rating
 * (including 'None' and any unexpected stored value like the string
 * 'false'). Returning null rather than the raw value is what fixes the
 * "'s: false" display bug -- callers simply don't render anything when
 * this returns null, instead of dumping the raw field unhandled.
 */
export function renderStars(star: string | undefined): string | null {
  const count = Number(star);
  if (!star || star === 'None' || Number.isNaN(count) || count < 1 || count > 3) {
    return null;
  }
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count));
}
