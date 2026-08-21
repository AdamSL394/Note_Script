import React from 'react';
import Grid from '@mui/material/Grid/index.js';
import Container from '@mui/material/Container/index.js';
import Notes from '../Notes/notes';
import type { Note as NoteType } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import './entireNoteHistory.css';

const NoteHistory = () => {
  // Stages a star-rating change in sessionStorage without hitting the
  // server — Notes.tsx's saveNote reads this draft back out and
  // persists it for real once the whole note is saved.
  const onStarValueChange = (e: SelectChangeEvent, note: NoteType) => {
    const rawDraft = sessionStorage.getItem(note._id);
    const draftNote: NoteType | null = rawDraft ? JSON.parse(rawDraft) : null;
    const source = draftNote ?? note;
    const newNote: NoteType = {
      ...source,
      star: e.target.value,
    };
    sessionStorage.setItem(note._id, JSON.stringify(newNote));
  };

  return (
    <div>
      <Container maxWidth={false} style={{ marginTop: '4rem' }}>
        <Grid className="grid" container justifyContent="center">
          <Notes onStarValueChange={onStarValueChange}></Notes>
        </Grid>
      </Container>
    </div>
  );
};

export { NoteHistory };
