import type { Note } from '../../types';
import { WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { getTagColor } from '../../utils/tagColor';
import { getRelevantTagFields } from '../../utils/resolveNoteTags';

interface EditingTrackedEmojisProps {
  note: Note;
  setNoteValue: (note: Note) => void;
}

export const EditingTrackedEmojis = (props: EditingTrackedEmojisProps) => {
    // Builds a new note object with `field` toggled and hands it to
    // setNoteValue for an immutable update, instead of mutating props.note
    // directly. Using `!note[field]` (rather than an `=== false` check)
    // also correctly handles a freshly created note where these fields
    // are `undefined` rather than explicitly `false`. `field` is typed
    // as `string` (from NOTE_TAG_FIELDS) rather than a boolean-key union,
    // since 'date/smoosh' isn't a valid identifier — bracket access via
    // Record cast, same pattern used everywhere else this list is read.
    const toggleField = (note: Note, field: string) => {
        if (RESERVED_NOTE_FIELDS.has(field)) {
            // A tag whose name collides with a real Note schema field
            // (e.g. a tag literally named "star") would otherwise
            // overwrite that field instead of behaving as a tag --
            // this is exactly what broke saving entirely. Safe no-op
            // rather than corrupting real data.
            return;
        }
        // Reads any existing draft first, exactly matching setDateNote
        // and onStarValueChange -- without this, a tag toggle only
        // updated React state, never sessionStorage. saveNote reads
        // sessionStorage as its source of truth, so a toggle applied
        // after any text/date edit (which DOES write a draft) got
        // silently discarded the moment Save read that now-stale
        // draft, even though the toggle visibly changed on screen.
        const rawStored = sessionStorage.getItem(note._id);
        const storedNote: Note | null = rawStored ? JSON.parse(rawStored) : null;
        const baseNote = storedNote ?? note;
        const record = baseNote as unknown as Record<string, unknown>;
        const updatedNote: Note = { ...baseNote, [field]: !record[field] };
        sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
        props.setNoteValue(updatedNote);
    };

    return (
        <div className="editingTagRow">
            {getRelevantTagFields(props.note).map(({ field, icon, label }) => {
                const record = props.note as unknown as Record<string, unknown>;
                const isActive = Boolean(record[field]);
                const isWin = WIN_TAGS.includes(field);
                // Win tags keep their amber treatment unconditionally
                // (a meaningful signal, not decoration) -- only non-win
                // active tags get the per-tag hash color, matching the
                // same rule used on the Home and All Notes screens.
                const tagColor =
                    isActive && !isWin
                        ? getTagColor(field)
                        : isActive && isWin
                        ? { background: 'var(--ns-amber-tint)', text: 'var(--ns-amber-dark)' }
                        : null;
                return (
                    <span
                        key={field}
                        role="img"
                        aria-label={label}
                        title={label}
                        className={isActive ? 'tagChip active' : 'tagChip'}
                        style={
                            tagColor
                                ? {
                                      cursor: 'pointer',
                                      borderColor: 'transparent',
                                      background: tagColor.background,
                                      color: tagColor.text,
                                  }
                                : { cursor: 'pointer' }
                        }
                        onClick={() => toggleField(props.note, field)}
                    >
                        {icon}
                    </span>
                );
            })}
        </div>
    );
};
