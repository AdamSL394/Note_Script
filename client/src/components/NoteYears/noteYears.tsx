import React from 'react';
import Link from '@mui/material/Link/index.js';

// The minimal shape notesYears() actually needs — not the full
// NoteYearsProps shape. Callers (like SearchNotes) pass their own props
// object through here, and that object's exact shape varies by caller;
// what matters is just that it has these two fields.
export interface NotesYearsCallbackProps {
  currentPage: number;
  setNotesBasedOnYear: (page: unknown, year: string | number) => void;
}

interface NoteYearsProps {
  noteYears: (string | number)[];
  currentDbCall: string | number;
  notesYears: (props: NotesYearsCallbackProps, year: string | number) => void;
  currentPage: number;
  setNotesBasedOnYear: (page: unknown, year: string | number) => void;
}

function NoteYears(props: NoteYearsProps) {
  return (
    <div style={gridStyles}>
      {props.noteYears.map((year, key) => (
        <Link
          key={key}
          onClick={() => handleYearClick(year, props)}
          className="noteYears"
          style={getLinkStyles(year, props)}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}

function handleYearClick(year: string | number, props: NoteYearsProps) {
  if (year !== props.currentDbCall) {
    props.notesYears(props, year);
  }
}

function getLinkStyles(
  year: string | number,
  props: NoteYearsProps
): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    padding: '2px 10px',
    borderRadius: '20px',
    border: '0.5px solid var(--ns-rule)',
    background: 'var(--ns-fog)',
  };
  if (year === props.currentDbCall) {
    return {
      ...base,
      cursor: 'default',
      color: 'var(--ns-graphite)',
      textDecoration: 'none',
    };
  } else {
    return {
      ...base,
      cursor: 'pointer',
      color: 'var(--ns-blue)',
    };
  }
}

// Previously `position: absolute; left: 2%`, floating this year list
// on top of the note-card grid below it instead of taking its own
// space in the page flow — the two visually overlapped as soon as
// there were enough cards to reach that height. A plain wrapping flex
// row keeps it in normal document flow, so it always renders above
// the cards it belongs with rather than over them.
const gridStyles: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '0.75rem',
  marginBottom: '0.75rem',
};

export default NoteYears;