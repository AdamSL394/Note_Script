import React from 'react';
import Link from '@mui/material/Link/index.js';
import Grid from '@mui/material/Grid/index.js';

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
    <Grid container style={gridStyles}>
      {props.noteYears.map((year, key) => (
        <Grid item xs={0.5} key={key + 11} style={itemStyles}>
          <Link
            key={key + 1}
            onClick={() => handleYearClick(year, props)}
            className="noteYears"
            style={getLinkStyles(year, props)}
          >
            {year}
          </Link>
        </Grid>
      ))}
    </Grid>
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
  if (year === props.currentDbCall) {
    return {
      cursor: 'default',
      color: 'grey',
      textDecoration: 'none',
    };
  } else {
    return {
      cursor: 'pointer',
      color: 'blue',
    };
  }
}

const itemStyles: React.CSSProperties = {
    marginBottom: '1.5rem',
  };

const gridStyles: React.CSSProperties = {
  left: '2%',
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column-reverse',
  marginTop: '.5%',
  width: '5%',
};

export default NoteYears;