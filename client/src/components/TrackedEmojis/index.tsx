import React from 'react';
import type { Note } from '../../types';
import { NOTE_TAG_FIELDS } from '../../constants/noteFields';

interface TrackedEmojisProps {
  note: Note;
}

export const TrackedEmojis = (props: TrackedEmojisProps) => {
    // 'date/smoosh' isn't a valid identifier, so it has to be read via
    // bracket access — same pattern as NotesHomeView/Note.
    const record = props.note as unknown as Record<string, unknown>;

    return (
        <div>
            {NOTE_TAG_FIELDS.map(({ field, icon, label }) =>
                record[field] ? (
                    <span
                        key={field}
                        role="img"
                        aria-label={label}
                        className="emoji"
                    >
                        {icon}{' '}
                    </span>
                ) : null
            )}
        </div>
    );
};
