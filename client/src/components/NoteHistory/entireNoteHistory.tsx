import Container from '@mui/material/Container/index.js';
import Notes from '../Notes/notes';
import type { Note } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import './entireNoteHistory.css';

const NoteHistory = () => {
  // Bound to a MUI <Select>'s onChange (see editingNote.tsx), not a
  // plain input — SelectChangeEvent is the correct type here, matching
  // how notes.tsx types the same callback.
  const onStarValueChange = (e: SelectChangeEvent, note: Note) => {
    const rawDraft = sessionStorage.getItem(note._id);
    const updatedNote: Note | null = rawDraft ? JSON.parse(rawDraft) : null;
    const newNote: Partial<Note> = updatedNote
      ? {
          text: updatedNote.text,
          date: updatedNote.date,
          star: e.target.value,
          _id: updatedNote._id,
          edit: updatedNote.edit,
        }
      : {
          text: note.text,
          date: note.date,
          star: e.target.value,
          _id: note._id,
          edit: note.edit,
        };
    sessionStorage.setItem(note._id, JSON.stringify(newNote));
  };

  return (
    <div>
      <Container
        maxWidth={false}
        style={{ marginTop: "4rem"}}
      >
        <Notes
          onStarValueChange={onStarValueChange}
        ></Notes>
      </Container>
    </div>
  );
};

export { NoteHistory };
