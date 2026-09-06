import { NOTE_TAG_FIELDS, NoteFieldConfig } from '../constants/noteFields';
import type { Note, TagSnapshot, TrackedStat } from '../types';

/**
 * Builds a single name -> {field, icon, label} lookup map, checking
 * built-in NOTE_TAG_FIELDS first, then the user's own trackedStats
 * (where a custom tag's current chosen icon lives). Used when a tag
 * is being toggled ON, to resolve what icon to snapshot onto the note
 * at that moment -- NOT for displaying a note's already-set tags,
 * which read their icon directly from the note's own snapshot instead
 * (see getActiveNoteTags below).
 */
export function buildTagLookup(trackedStats: TrackedStat[]): Map<string, NoteFieldConfig> {
  const lookup = new Map<string, NoteFieldConfig>();
  for (const field of NOTE_TAG_FIELDS) {
    lookup.set(field.field, field);
  }
  for (const stat of trackedStats) {
    if (!lookup.has(stat.name)) {
      lookup.set(stat.name, { field: stat.name, icon: stat.icon, label: stat.name });
    }
  }
  return lookup;
}

/**
 * Resolves a single tag name to the icon it should be snapshotted with
 * right now (built-in or the user's current trackedStats), falling
 * back to a generic tag icon if it isn't found in either -- e.g. a
 * name that exists only on old notes and isn't currently a
 * suggestion or in the user's own settings.
 */
export function resolveTagDisplay(
  tagName: string,
  trackedStats: TrackedStat[]
): NoteFieldConfig {
  const lookup = buildTagLookup(trackedStats);
  return lookup.get(tagName) ?? { field: tagName, icon: '🏷️', label: tagName };
}

/**
 * Resolves a note's active tags (note.tags, the source of truth) into
 * displayable {field, icon, label} entries.
 *
 * Trivial now that each tag snapshots its own icon: no trackedStats
 * cross-reference is needed at all to display an already-tagged
 * note's icons correctly, even if the user has since renamed or
 * deleted that tag from their own settings -- the note's own snapshot
 * is unaffected either way.
 */
export function getActiveNoteTags(note: Note): NoteFieldConfig[] {
  const tags = note.tags ?? [];
  return tags.map(
    (tag: TagSnapshot): NoteFieldConfig => ({ field: tag.name, icon: tag.icon, label: tag.name })
  );
}
