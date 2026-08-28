import Card from '@mui/material/Card/index.js';
import Button from '@mui/material/Button/index.js';
import NoteText from '../NoteText/noteText';
import type { Note as NoteType } from '../../types';
import { NOTE_TAG_FIELDS } from '../../constants/noteFields';

interface NoteProps {
  note: NoteType;
  openModal: (note: NoteType) => void;
  updateNote: (note: NoteType) => void;
}

function Note(props: NoteProps) {
    const editNote = (note: NoteType) => {
        const noteToEdit: NoteType = {
            ...note,
            textLength: 200 - note.text.length,
            edit: true,
        };
        sessionStorage.setItem(noteToEdit._id, JSON.stringify(noteToEdit));
        props.updateNote(noteToEdit);
    };

    // 'date/smoosh' isn't a valid identifier, so it has to be read via
    // bracket access — same pattern as NotesHomeView.
    const record = props.note as unknown as Record<string, unknown>;

    return (
        <div className="noteCard">
            <Card
                style={{ marginBottom: '2%' }}
                id="Card"
                variant="outlined"
            >
                <Button
                    id="deleteButton"
                    onClick={() => props.openModal(props.note)}
                >
                    <strong>X</strong>
                </Button>
                <span
                    style={{ float: 'left', cursor: 'pointer' }}
                    onClick={() => editNote(props.note)}
                >
          🖊
                </span>
                <div
                    style={{
                        marginBottom: '5%',
                        borderBottom: '1px solid var(--ns-rule)',
                    }}
                >
                    <span style={{ marginRight: '5%' }}>
                        {' '}
                        <strong>{props.note.date}</strong>
                    </span>
                    <strong>
                        <span role="img" aria-label="star">
              ✨
                        </span>{' '}
            &apos;s:&nbsp; {props.note.star}
                    </strong>
                </div>

                <NoteText note={props.note}></NoteText>

                <div style={{ borderTop: '1px solid var(--ns-rule)', padding: '0.4rem 0' }}>
                    {NOTE_TAG_FIELDS.map(({ field, icon, label }) =>
                        record[field] ? (
                            <span
                                key={field}
                                role="img"
                                aria-label={label}
                                style={{
                                    marginRight: '.4rem',
                                    display: 'inline-block',
                                }}
                            >
                                {icon}
                            </span>
                        ) : null
                    )}
                </div>
            </Card>
        </div>
    );
}

export default Note;
