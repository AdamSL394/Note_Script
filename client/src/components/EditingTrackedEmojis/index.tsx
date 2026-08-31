import type { Note } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS } from '../../constants/noteFields';
import { getTagColor } from '../../utils/tagColor';

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
        const record = note as unknown as Record<string, unknown>;
        const updatedNote: Note = { ...note, [field]: !record[field] };
        props.setNoteValue(updatedNote);
    };

    return (
        <div className="editingTagRow">
            {NOTE_TAG_FIELDS.map(({ field, icon, label }) => {
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
