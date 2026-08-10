import React from 'react';
import type { Note } from '../../types';

interface NoteTextProps {
  note: Note;
}

function NoteText({ note }: NoteTextProps) {
    return (
        <ul style={{ textAlign: 'left' }}>
      {note.text.split('\n').map((line, key) => {
        if (line.trim() === '') {
          return null; 
        }
        const formattedLine = line.charAt(0).toUpperCase() + line.slice(1);
        return (
          <li key={key} style={{ padding: '5px 3px' }}>
            {formattedLine}
          </li>
        );
      })}
    </ul>
    );
}
export default NoteText;