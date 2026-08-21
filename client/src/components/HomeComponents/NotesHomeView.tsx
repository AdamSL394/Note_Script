import React from 'react';
import { NoteCard } from '../NoteCard/index';
import type { Note } from '../../types';

interface HomeNotesProps {
  notes: Note[];
}

// Read-only digest for HomeView's weekly/yearly lookback - no edit or
// delete affordances, so NoteCard renders them without either handler.
export const HomeNotes = ({ notes }: HomeNotesProps) => (
  <>
    {notes.map((note) => (
      <NoteCard key={note._id} note={note} />
    ))}
  </>
);
