import React, { useState } from 'react';
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

// How many of the most recent years show before truncating to "…".
// Matches the note-list pagination's own boundary/sibling counts in
// spirit (a handful near the front, a clear jump to the far end)
// rather than introducing a different truncation convention.
const VISIBLE_YEAR_COUNT = 6;

const SPECIAL_ENTRIES = new Set(['Recently Changed', 'All']);

function NoteYears(props: NoteYearsProps) {
  const [expanded, setExpanded] = useState(false);

  // getNoteYears() builds this list oldest-first with the two special
  // entries appended at the end — a sidebar reads more naturally with
  // the most recent year on top and the specials pinned above the
  // chronological list, so both get reordered for display here rather
  // than changing what's actually stored/fetched.
  const specials = props.noteYears.filter((year) => SPECIAL_ENTRIES.has(String(year)));
  const years = props.noteYears
    .filter((year) => !SPECIAL_ENTRIES.has(String(year)))
    .slice()
    .reverse();

  const needsTruncation = !expanded && years.length > VISIBLE_YEAR_COUNT + 1;
  const visibleYears = needsTruncation
    ? years.slice(0, VISIBLE_YEAR_COUNT)
    : years;
  const oldestYear = years[years.length - 1];

  return (
    <nav className="noteYearsSidebar" aria-label="Filter notes by year">
      {specials.length > 0 && (
        <div className="noteYearsGroup">
          {specials.map((year) => (
            <Link
              key={year}
              onClick={() => handleYearClick(year, props)}
              className="noteYears"
              style={getLinkStyles(year, props)}
            >
              {year}
            </Link>
          ))}
        </div>
      )}

      {years.length > 0 && (
        <div className="noteYearsGroup noteYearsDivider">
          {visibleYears.map((year) => (
            <Link
              key={year}
              onClick={() => handleYearClick(year, props)}
              className="noteYears"
              style={getLinkStyles(year, props)}
            >
              {year}
            </Link>
          ))}

          {needsTruncation && (
            <>
              <Link
                component="button"
                onClick={() => setExpanded(true)}
                className="noteYears noteYearsEllipsis"
                aria-label="Show all years"
              >
                …
              </Link>
              <Link
                key={oldestYear}
                onClick={() => handleYearClick(oldestYear, props)}
                className="noteYears"
                style={getLinkStyles(oldestYear, props)}
              >
                {oldestYear}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
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
    padding: '3px 10px',
    borderRadius: '20px',
    border: '0.5px solid var(--ns-rule)',
    background: 'var(--ns-fog)',
    textAlign: 'center',
  };
  if (year === props.currentDbCall) {
    return {
      ...base,
      cursor: 'default',
      color: 'var(--ns-graphite)',
      textDecoration: 'none',
      background: 'var(--ns-blue-tint)',
      borderColor: 'var(--ns-blue)',
    };
  } else {
    return {
      ...base,
      cursor: 'pointer',
      color: 'var(--ns-blue)',
    };
  }
}

export default NoteYears;
