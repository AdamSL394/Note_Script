import React from 'react';
import Notes from '../Notes/notes';
import './entireNoteHistory.css';

// Notes owns its own edit/save/delete state via useEditableNotes
// internally, and its own top-level layout via its own <Container> -
// so this wrapper is just page-level chrome (top margin) around it,
// not a second layout container.
const NoteHistory = () => {
  return (
    <div style={{ marginTop: '4rem' }}>
      <Notes />
    </div>
  );
};

export { NoteHistory };
