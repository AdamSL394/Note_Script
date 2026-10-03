/**
 * Capitalizes the first letter of checklist item text, leaving the rest
 * of the string untouched (so "milk, EGGS" stays "Milk, EGGS" -- this
 * only fixes the one leading letter, not a full title-case pass). A
 * no-op if the first character isn't a letter (digits, emoji, etc.) or
 * is already uppercase. Applied at commit time (blur/Enter/save), not
 * on every keystroke, so it doesn't fight the user while they're still
 * typing or editing the start of the word.
 */
export function capitalizeChecklistText(text: string): string {
  if (!text) return text;
  const first = text[0];
  const upper = first.toUpperCase();
  if (first === upper) return text;
  return upper + text.slice(1);
}
