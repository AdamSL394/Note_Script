import React from 'react';
import type { Note } from '../../types';

interface EditingTrackedEmojisProps {
  note: Note;
  setNoteValue: (note: Note) => void;
}

// Only the fields this component's emoji row actually toggles — a
// narrower, more honest type than "any boolean key of Note," since it
// documents exactly what's used here rather than promising more.
type ToggleableField =
  | 'look'
  | 'gym'
  | 'weed'
  | 'code'
  | 'read'
  | 'eatOut'
  | 'basketball';

export const EditingTrackedEmojis = (props: EditingTrackedEmojisProps) => {
    // Builds a new note object with `field` toggled and hands it to
    // setNoteValue for an immutable update, instead of mutating props.note
    // directly. Using `!note[field]` (rather than an `=== false` check)
    // also correctly handles a freshly created note where these fields
    // are `undefined` rather than explicitly `false`.
    const toggleField = (note: Note, field: ToggleableField) => {
        const updatedNote: Note = { ...note, [field]: !note[field] };
        props.setNoteValue(updatedNote);
    };

    return (
        <>
            <div style={{ borderTop: '1px solid #cbcbcb' }}>
                <span
                    role="img"
                    aria-label="eyes"
                    style={{
                        marginRight: '.4rem',
                        border: '2px lightgrey',
                        borderRadius: '10px 10px 10px 10px',
                        cursor: 'pointer',
                        paddingLeft: '4px',
                    }}
                    onClick={() => toggleField(props.note, 'look')}
                >
                    {' '}
            👀{' '}
                </span>

                <span
                    role="img"
                    aria-label="arm"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'gym')}
                >
            💪🏼{' '}
                </span>

                <span
                    role="img"
                    aria-label="leaf"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'weed')}
                >
            🍁{' '}
                </span>

                <span
                    role="img"
                    aria-label="computer guy"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'code')}
                >
            👨🏻‍💻{' '}
                </span>

                <span
                    role="img"
                    aria-label="books"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'read')}
                >
            📚{' '}
                </span>

                <span
                    role="img"
                    aria-label="pizza"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'eatOut')}
                >
            🍕{' '}
                </span>

                <span
                    role="img"
                    aria-label="basketball"
                    style={{ marginRight: '.4rem', cursor: 'pointer' }}
                    onClick={() => toggleField(props.note, 'basketball')}
                >
            ⛹🏻‍♂️{' '}
                </span>
            </div>
        </>
    );
};