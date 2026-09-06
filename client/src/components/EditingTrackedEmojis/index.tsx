import type { Note, TrackedStat } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { getTagColor } from '../../utils/tagColor';

interface EditingTrackedEmojisProps {
    note: Note;
    trackedStats: TrackedStat[];
    setNoteValue: (note: Note) => void;
}

export const EditingTrackedEmojis = (props: EditingTrackedEmojisProps) => {
    // Adds or removes a tag from the note's tags array and hands the
    // result to setNoteValue for an immutable update, instead of
    // mutating props.note directly. `icon` is only needed when turning
    // a tag ON -- it's what gets snapshotted onto the note at this
    // exact moment, per the current icon of whichever built-in or
    // custom tag this is.
    const toggleField = (note: Note, field: string, icon: string) => {
        if (RESERVED_NOTE_FIELDS.has(field)) {
            // Defense in depth -- this tag is already filtered out of
            // the rendered chip list below, so this should be
            // unreachable, but stays as a safe no-op regardless.
            return;
        }
        // Reads any existing draft first, matching setDateNote and
        // onStarValueChange -- without this, a tag toggle would only
        // update React state, never sessionStorage, and saveNote reads
        // sessionStorage as its source of truth.
        const rawStored = sessionStorage.getItem(note._id);
        const storedNote: Note | null = rawStored ? JSON.parse(rawStored) : null;
        const baseNote = storedNote ?? note;
        const currentTags = baseNote.tags ?? [];
        const isActive = currentTags.some((t) => t.name === field);
        const newTags = isActive
            ? currentTags.filter((t) => t.name !== field)
            : [...currentTags, { name: field, icon }];
        const updatedNote: Note = { ...baseNote, tags: newTags };
        sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
        props.setNoteValue(updatedNote);
    };

    const activeTags = props.note.tags ?? [];
    const activeTagNames = new Set(activeTags.map((t) => t.name));

    // Every tag the user could possibly toggle here: the built-in
    // suggestions, plus every custom tag they've ever created
    // (trackedStats) -- not just whichever tags happen to already be
    // active on this specific note. A tag active on this note but not
    // in either list (e.g. a legacy tag from before this feature) is
    // still shown, using its own snapshotted icon, so it can be turned
    // off even if it isn't otherwise a known option.
    const toggleableFields = new Map<string, { icon: string; label: string }>();
    for (const f of NOTE_TAG_FIELDS) {
        toggleableFields.set(f.field, { icon: f.icon, label: f.label });
    }
    for (const stat of props.trackedStats) {
        if (!toggleableFields.has(stat.name) && !RESERVED_NOTE_FIELDS.has(stat.name)) {
            toggleableFields.set(stat.name, { icon: stat.icon, label: stat.name });
        }
    }
    for (const tag of activeTags) {
        if (!toggleableFields.has(tag.name) && !RESERVED_NOTE_FIELDS.has(tag.name)) {
            toggleableFields.set(tag.name, { icon: tag.icon, label: tag.name });
        }
    }

    return (
        <div className="editingTagRow">
            {Array.from(toggleableFields.entries()).map(([field, { icon, label }]) => {
                const isActive = activeTagNames.has(field);
                const isWin = WIN_TAGS.includes(field);
                // Win tags keep their amber treatment unconditionally
                // (a meaningful signal, not decoration) -- only
                // non-win active tags get the per-tag hash color,
                // matching the same rule used everywhere else tags
                // render.
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
                        onClick={() => toggleField(props.note, field, icon)}
                    >
                        {icon}
                    </span>
                );
            })}
        </div>
    );
};
