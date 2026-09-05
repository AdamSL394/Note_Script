import React, { useState } from 'react';
import Link from '@mui/material/Link/index.js';
import './noteYears.css';

interface NoteYearsProps {
  noteYears: (string | number)[];
  currentSelection: string | number;
  onSelectYear: (year: string | number) => void;
}

const SPECIAL_ENTRIES = new Set(['Recently Changed', 'All']);

// Per the "2026, 2025, 2024 ... [oldest]" request: show this many of
// the most recent years before collapsing the rest behind a "...", which
// expands to the full list on click.
const VISIBLE_YEAR_COUNT = 10;

function NoteYears({ noteYears, currentSelection, onSelectYear }: NoteYearsProps) {
  const [expanded, setExpanded] = useState(false);

  // useNoteYears builds the list oldest-first with the two special
  // entries appended at the end — reversed here for display so the
  // sidebar reads most-recent-year-first (2026, 2025, 2024, ...), which
  // is how someone actually scans a list of years.
  const specials = noteYears.filter((y) => SPECIAL_ENTRIES.has(String(y)));
  const years = noteYears
    .filter((y) => !SPECIAL_ENTRIES.has(String(y)))
    .slice()
    .reverse();

  const needsTruncation = !expanded && years.length > VISIBLE_YEAR_COUNT + 1;
  const visibleYears = needsTruncation ? years.slice(0, VISIBLE_YEAR_COUNT) : years;
  const oldestYear = years[years.length - 1];

  const linkStyle = (year: string | number): React.CSSProperties => {
    const isSelected = year === currentSelection;
    return {
      cursor: isSelected ? 'default' : 'pointer',
      color: isSelected ? 'var(--ns-graphite)' : 'var(--ns-blue)',
      textDecoration: isSelected ? 'none' : 'underline',
    };
  };

  const yearLink = (year: string | number) => (
    <Link
      key={year}
      onClick={() => onSelectYear(year)}
      className="noteYears"
      style={linkStyle(year)}
    >
      {year}
    </Link>
  );

  // For narrow screens (see noteYears.css) -- a native select scales to
  // any number of years without needing the truncate/expand logic the
  // inline link list above uses, and reads more cleanly than a long
  // wrapped row of year links once space is tight.
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const isYear = /^\d+$/.test(value);
    onSelectYear(isYear ? Number(value) : value);
  };

  return (
    <nav className="noteYearsSidebar" aria-label="Filter notes by year">
      <select
        className="noteYearsDropdown"
        value={String(currentSelection)}
        onChange={handleDropdownChange}
        aria-label="Filter notes by year"
      >
        {specials.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <div className="noteYearsGroup">{specials.map(yearLink)}</div>

      {years.length > 0 && (
        <div className="noteYearsGroup noteYearsDivider">
          {visibleYears.map(yearLink)}
          {needsTruncation && (
            <>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="noteYears noteYearsEllipsis"
                aria-label="Show all years"
              >
                …
              </button>
              {yearLink(oldestYear)}
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default NoteYears;
