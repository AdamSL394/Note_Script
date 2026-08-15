import { useAuth0 } from '@auth0/auth0-react';
import React, { useState } from 'react';
import NoteRoutes from '../../../router/noteRoutes';
import Switch from '@mui/material/Switch/index.js';
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

export const LookBack = (props: LookBackProps) => {
  const [checked, setChecked] = useState(true);
  const { user } = useAuth0();

  const getNoteRangeYear = async () => {
    const userid = user?.sub?.split('|')[1];
    if (!userid) return;
    const { today: todayLastYear, weekAhead: weekAheadLastYear } =
      computeYearAgoRange(1);

    try {
      const res = await NoteRoutes.getNoteRangeYear(
        userid,
        weekAheadLastYear,
        todayLastYear
      );

      if (res) {
        if (res.length < 1) {
          props.setNotes(res);
          props.setnoNotes('No Notes for last year.');
          return;
        }
        props.setNoteError('');
        props.setnoNotes('');
        props.setNotes(res);
      }
    } catch (error) {
        props.setNoteError('Error Getting Notes');
    }
  };


  const onNumericChange = async (checked: boolean, value: string) => {
    props.setTimePeriod(value);
    const userid = user?.sub?.split('|')[1];
    if (checked) {
      if (!userid) return;
      if (value === '1') {
        props.setNoteView('week');
        const todaysDate = new Date().toISOString().split('T')[0];
        const myCurrentDate = new Date();
        const myPastDate = new Date(myCurrentDate);
        myPastDate.setDate(myPastDate.getDate() - 7);
        const lastWeeksDate = myPastDate.toISOString().split('T')[0];
        props.getNoteRanges(userid, todaysDate, lastWeeksDate);
      }
      if (value === '2') {
        props.setNoteView('weeks');
        const myCurrentDate = new Date();
        const myPastDate = new Date(myCurrentDate);
        myPastDate.setDate(myPastDate.getDate() - 7);
        const eightDaysago = myPastDate.toISOString().split('T')[0];
        const pastDate = new Date(myCurrentDate);
        pastDate.setDate(pastDate.getDate() - 14);
        const fourteenDaysAgo = pastDate.toISOString().split('T')[0];
        props.getNoteRanges(userid, eightDaysago, fourteenDaysAgo);
      }
      if (value === '3') {
        props.setNoteView('weeks');
        const myCurrentDate = new Date();
        const myPastDate = new Date(myCurrentDate);
        myPastDate.setDate(myPastDate.getDate() - 14);
        const eightDaysago = myPastDate.toISOString().split('T')[0];
        const pastDate = new Date(myCurrentDate);
        pastDate.setDate(pastDate.getDate() - 22);
        const fourteenDaysAgo = pastDate.toISOString().split('T')[0];
        props.getNoteRanges(userid, eightDaysago, fourteenDaysAgo);
      }
    }
    // year
    if (!checked) {
      if (value === '1') {
        props.setNoteView('year');
        getNoteRangeYear();
      }
      if (value === '2') {
        if (!userid) return;
        props.setNoteView('years');
        const { today: todayLastYear, weekAhead: weekAheadLastYear } =
          computeYearAgoRange(2);
        const res = await NoteRoutes.getNoteRangeYear(
          userid,
          weekAheadLastYear,
          todayLastYear
        );
        if (res) {
          if (res.length < 1) {
            props.setNotes(res);
            props.setnoNotes('No Notes for last year.');
            return;
          }
          props.setNoteError('');
          props.setnoNotes('');
          props.setNotes(res);
        }
      }
      if (value === '3') {
        if (!userid) return;
        props.setNoteView('years');
        const { today: todayLastYear, weekAhead: weekAheadLastYear } =
          computeYearAgoRange(3);
        const res = await NoteRoutes.getNoteRangeYear(
          userid,
          weekAheadLastYear,
          todayLastYear
        );
        if (res) {
          if (res.length < 1) {
            props.setNotes(res);
            props.setnoNotes('No Notes for last year.');
            return;
          }
          props.setNoteError('');
          props.setnoNotes('');
          props.setNotes(res);
        }
      }
    }
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
    <>
      

      <h2 id="pastNoteHeader" style={{display:"inline-block"}}>
        <span>
          <form
            action="#"
            onChange={(e: React.ChangeEvent<HTMLFormElement>) => {
              // The handler is on the form, but the actual change comes
              // from the child <select> — React's event bubbles that
              // correctly at runtime, but TS can't know it structurally
              // from a form-level ChangeEvent, hence the explicit cast.
              const target = e.target as unknown as HTMLSelectElement;
              onNumericChange(checked, target.value);
            }}
            style={{ marginRight: '12rem' }}
          >
            <select
              name="languages"
              id="lang"
              style={{ position: 'absolute', marginTop: '.4rem' }}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </form>
        </span>
        <span>{props.noteview} ago</span>
      </h2>

      <span style={{marginBottom: '1rem', right: '2%', position: 'relative'}}>
        <Switch
          style={{verticalAlign: 'unset !important'}}
          checked={checked}
          onChange={handleChange}
          inputProps={{ 'aria-label': 'controlled' }}
          id="switch"
        />
      </span>
    </>
  );
};