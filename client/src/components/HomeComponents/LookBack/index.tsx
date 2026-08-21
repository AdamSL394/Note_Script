import { useAuth0 } from '@auth0/auth0-react';
import React, { useState } from 'react';
import NoteRoutes from '../../../router/noteRoutes';
import Switch from '@mui/material/Switch/index.js';
import Select, { SelectChangeEvent } from '@mui/material/Select/index.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import type { Note } from '../../../types';

interface LookBackProps {
  timePeriod: string;
  setNotes: (notes: Note[]) => void;
  setnoNotes: (text: string) => void;
  setNoteError: (text: string) => void;
  setTimePeriod: (value: string) => void;
  setNoteView: (value: string) => void;
  getNoteRanges: (
    userid: string,
    todaysDate: string,
    lastWeeksDate: string
  ) => Promise<void>;
  noteview: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

interface YearAgoRange {
  today: string;
  weekAhead: string;
}

// Computes the "N years ago" date and a week-ahead boundary from it,
// using real Date arithmetic so month/year rollovers (e.g. day 28 + 7)
// and single-digit days are handled correctly — the previous version
// built these as raw, sometimes-unpadded strings, which broke the
// lexicographic date-range comparison whenever today's day-of-month
// was 1 or 2 (producing e.g. "2025-08-8" instead of "2025-08-08").
const computeYearAgoRange = (yearsAgo: number): YearAgoRange => {
  const past = new Date();
  past.setFullYear(past.getFullYear() - yearsAgo);

  const future = new Date(past);
  future.setDate(future.getDate() + 7);

  const today = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(
    past.getDate()
  )}`;
  const weekAhead = `${future.getFullYear()}-${pad(
    future.getMonth() + 1
  )}-${pad(future.getDate())}`;

  return { today, weekAhead };
};

// A day-offset window: `startOffset` days ago through `endOffset` days
// ago, e.g. {startOffset: 0, endOffset: 7} = "today through a week ago".
// Value 3's window is 8 days wide (14→22) rather than 7, matching the
// original behavior exactly - preserved here rather than "corrected"
// as part of this cleanup.
interface WeekRangeConfig {
  noteView: string;
  startOffset: number;
  endOffset: number;
}

// Keyed by the Select's value ('1' | '2' | '3'), same convention as
// TAG_CONFIG elsewhere in the app: one small table instead of one
// hand-written conditional block per value.
const WEEK_RANGES: Record<string, WeekRangeConfig> = {
  '1': { noteView: 'week', startOffset: 0, endOffset: 7 },
  '2': { noteView: 'weeks', startOffset: 7, endOffset: 14 },
  '3': { noteView: 'weeks', startOffset: 14, endOffset: 22 },
};

// Year lookback is just "N years ago", so the value doubles directly as
// yearsAgo - no table needed, just Number(value).
const daysAgoIso = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

export const LookBack = (props: LookBackProps) => {
  const [checked, setChecked] = useState(true);
  const { user } = useAuth0();

  // Fetches and applies the "N years ago" note range, shared by all
  // three yearly Select values (previously duplicated three times).
  const fetchYearRange = async (yearsAgo: number) => {
    const userid = user?.sub?.split('|')[1];
    if (!userid) return;
    const { today: todayLastYear, weekAhead: weekAheadLastYear } =
      computeYearAgoRange(yearsAgo);

    try {
      const res = await NoteRoutes.getNoteRangeYear(
        userid,
        weekAheadLastYear,
        todayLastYear
      );
      if (!res) return;
      if (res.length < 1) {
        props.setNotes(res);
        props.setnoNotes('No Notes for last year.');
        return;
      }
      props.setNoteError('');
      props.setnoNotes('');
      props.setNotes(res);
    } catch (error) {
      props.setNoteError('Error Getting Notes');
    }
  };

  const onNumericChange = async (checked: boolean, value: string) => {
    props.setTimePeriod(value);
    const userid = user?.sub?.split('|')[1];

    if (checked) {
      const range = WEEK_RANGES[value];
      if (!userid || !range) return;
      props.setNoteView(range.noteView);
      props.getNoteRanges(
        userid,
        daysAgoIso(range.startOffset),
        daysAgoIso(range.endOffset)
      );
      return;
    }

    // year
    props.setNoteView(value === '1' ? 'year' : 'years');
    await fetchYearRange(Number(value));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.checked;
    setChecked(event.target.checked);

    if (!numericValue) {
      onNumericChange(numericValue, props.timePeriod);
      if (Number(props.timePeriod) > 1) {
        props.setNoteView('years');
        return;
      }
      props.setNoteView('year');
    }
    if (numericValue) {
      onNumericChange(numericValue, props.timePeriod);
      if (Number(props.timePeriod) > 1) {
        props.setNoteView('weeks');
        return;
      }
      props.setNoteView('week');
    }
  };

  return (
    <div className="lookBackRow">
      <Select
        size="small"
        value={props.timePeriod}
        onChange={(e: SelectChangeEvent) => {
          onNumericChange(checked, e.target.value);
        }}
        className="lookBackSelect"
      >
        <MenuItem value="1">1</MenuItem>
        <MenuItem value="2">2</MenuItem>
        <MenuItem value="3">3</MenuItem>
      </Select>

      <span className="lookBackLabel">{props.noteview} ago</span>

      <Switch
        checked={checked}
        onChange={handleChange}
        inputProps={{ 'aria-label': 'controlled' }}
        id="switch"
      />
    </div>
  );
};