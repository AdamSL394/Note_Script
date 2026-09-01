import Container from '@mui/material/Container/index.js';
import Notes from '../Notes/notes';
import type { Note } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import './noteHistory.css';

const NoteHistory = () => {
  // Bound to a MUI <Select>'s onChange (see editNote.tsx), not a
  // plain input — SelectChangeEvent is the correct type here, matching
  // how notes.tsx types the same callback.
  const onStarValueChange = (e: SelectChangeEvent, note: Note) => {
    const rawDraft = sessionStorage.getItem(note._id);
    const updatedNote: Note | null = rawDraft ? JSON.parse(rawDraft) : null;
    const baseNote = updatedNote ?? note;
    const newNote: Note = { ...baseNote, star: e.target.value };
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
