import { NOTE_TAG_FIELDS, RESERVED_NOTE_FIELDS, NoteFieldConfig } from '../constants/noteFields';
import type { Note } from '../types';

/**
 * Returns every tag field relevant to a note: the full curated
 * NOTE_TAG_FIELDS list, plus a generic fallback entry for any field
 * actually present and true on THIS note that isn't in that list (a
 * legacy tag added before it existed, or any other future drift
 * between what a user's account has and what's been curated here).
 * This is what makes tag display self-healing rather than requiring
 * every historical tag name to be manually discovered and added --
 * the exact gap that made 'starred' (formerly 'star') and any other
 * legacy tag invisible on cards even though it saved correctly.
 */
export function getRelevantTagFields(note: Note): NoteFieldConfig[] {
  const record = note as unknown as Record<string, unknown>;
  const knownFieldNames = new Set(NOTE_TAG_FIELDS.map((f) => f.field));

  const unknownActiveFields = Object.keys(record).filter(
    (key) =>
      !RESERVED_NOTE_FIELDS.has(key) &&
      !knownFieldNames.has(key) &&
      record[key] === true
  );

  const fallbackFields: NoteFieldConfig[] = unknownActiveFields.map((field) => ({
    field,
    icon: '🏷️',
    label: field,
  }));

  return [...NOTE_TAG_FIELDS, ...fallbackFields];
}
