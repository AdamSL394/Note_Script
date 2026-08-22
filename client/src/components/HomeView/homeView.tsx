/* eslint-disable max-len */
import { useAuth0 } from '@auth0/auth0-react';
import Container from '@mui/material/Container/index.js';
import React, { useEffect, useMemo, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { CreateNote } from '../HomeComponents/CreateNote';
import { LookBack } from '../HomeComponents/LookBack/index';
import { EditableNoteGrid } from '../EditableNoteGrid/index';
import { AlertMessage } from '../HomeComponents/SaveNoteAlert/index';
import { useEditableNotes } from '../../hooks/useEditableNotes';
import { NOTE_TAG_FIELDS, WIN_TAGS } from '../../constants/noteFields';
import type { Note as NoteType, TrackedStat, UserInfoResponse } from '../../types';
import './homeView.css';

// Built directly from NOTE_TAG_FIELDS — the same list NoteCard renders
// tag chips from — instead of a separately hand-typed, differently
// cased field list. That mismatch (a 'Study' field that doesn't exist
// on Note, 'EatOut' lowercased to 'eatout' when the real field is
// 'eatOut', and 'look' missing from the list entirely) was why most
// tags never showed a count above the note grid: this panel's keys
// silently didn't match the Note object's actual field names.
type PropertyCounts = Record<string, number>;

const EMPTY_COUNTS: PropertyCounts = Object.fromEntries(
  NOTE_TAG_FIELDS.map(({ field }) => [field, 0])
);

interface StreakDay {
  date: string;
  hasNote: boolean;
  isWin: boolean;
}

const HomeView = () => {
  const { user } = useAuth0();
  const [noNotes, setnoNotes] = useState<string | undefined>();
  const [noteError, setNoteError] = useState<string | undefined>();
  const [text, setText] = useState<string | undefined>();

  const [disabled, setDisabled] = useState(false);

  const [notes, setNotes] = useState<NoteType[]>([]);
  const [noteview, setNoteView] = useState('week');
  const [timePeriod, setTimePeriod] = useState('1');
  const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
  const [successFlag, setSuccessFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorFlag, setErrorFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [propertyCounts, setPropertyCounts] =
    useState<PropertyCounts>(EMPTY_COUNTS);
  const propertyNames = [
    'Gym',
    'Study',
    'Weed',
    'Code',
    'Read',
    'EatOut',
    'Basketball',
    'King',
    'Medal',
  ];

  // Auth0's `user.sub` is optional (undefined until authentication
  // resolves), so every call site that needs the derived userId goes
  // through this instead of asserting non-null and hoping.
  const getUserId = (): string | undefined => user?.sub?.split('|')[1];

  // Gives the weekly digest the same edit/save/delete behavior as the
  // "All Notes" page, instead of read-only cards. Unlike notes.tsx
  // (which repaginates "All Notes" after a delete), HomeView isn't
  // paginated — the currently loaded range is everything there is to
  // show, so a delete just needs to drop that one note locally.
  const {
    open,
    modelNoteId,
    editNote,
    saveNote,
    updateNote,
    setNoteValue,
    setDateNote,
    onStarValueChange,
    openModal,
    closeModal,
  } = useEditableNotes(setNotes, (deletedNoteId) => {
    setNotes((prevNotes) =>
      prevNotes.filter((note) => note._id !== deletedNoteId)
    );
  });

  useEffect(() => {
    const userid = getUserId();
    if (!userid || !user) {
      return;
    }
    const todaysDate = new Date().toISOString().split('T')[0];
    const myCurrentDate = new Date();
    const myPastDate = new Date(myCurrentDate);
    myPastDate.setDate(myPastDate.getDate() - 7);
    const lastWeeksDate = myPastDate.toISOString().split('T')[0];

    async function fetchData() {
      await getNoteRanges(userid as string, todaysDate, lastWeeksDate);
      getUserInformation();
    }

    fetchData();
  }, [user]);

  useEffect(() => {
    const counts: PropertyCounts = { ...EMPTY_COUNTS };

    // Note doesn't have (and shouldn't get) a generic index signature —
    // it's a deliberately strict, fully-named shape everywhere else in
    // the app. This loop is the one place that genuinely needs dynamic
    // key access, so it casts locally rather than weakening the shared
    // type for everyone.
    notes.forEach((note) => {
      const noteRecord = note as unknown as Record<string, unknown>;
      NOTE_TAG_FIELDS.forEach(({ field }) => {
        if (noteRecord[field]) {
          counts[field]++;
        }
      });
    });

    setPropertyCounts(counts);
  }, [notes]);

  const storeNewNote = async (
    stats: TrackedStat[],
    date: string | undefined
  ) => {
    const userId = getUserId();
    if (!userId) {
      return;
    }
    setDisabled(true);

    const raw: Record<string, unknown> = {
      text,
      date,
      userId,
    };
    if (!text || text.length < 1 || !date) {
      setErrorMessage('Please set a message & date');
      setErrorFlag('visible');
      setTimeout(() => {
        setErrorFlag('hidden');
        setDisabled(false);
      }, 2000);
      return;
    }

    for (const stat of stats) {
      if (stat.visible === 'visible') {
        raw[stat.name] = true;
      }
    }

    const res = await NoteRoutes.postNote(raw);
    const todaysDate = new Date().toISOString().split('T')[0];
    const myCurrentDate = new Date();
    const myPastDate = new Date(myCurrentDate);
    myPastDate.setDate(myPastDate.getDate() - 7);
    const lastWeeksDate = myPastDate.toISOString().split('T')[0];

    if (res && res.toString().includes('failed')) {
      setErrorMessage(res);
      setErrorFlag('visible');
      setTimeout(() => {
        setErrorFlag('hidden');
      }, 1500);
      setTimeout(() => {
        setDisabled(false);
      }, 1500);
    }

    // Reset text/status regardless of whether the saved note falls in the
    // "last week" window — only the extra getNoteRanges refresh below
    // depends on that.
    setText('');
    setSuccessMessage(res);
    setSuccessFlag('visible');

    // Build a new array/objects instead of mutating the existing
    // trackedStats state in place. Functional update form is used since
    // we're inside an async function and want the latest state, not a
    // possibly-stale closure value.
    setTrackedStats((prevStats) =>
      prevStats.map((stat) =>
        stat.visible === 'visible' ? { ...stat, visible: 'hidden' as const } : stat
      )
    );

    setTimeout(() => {
      setSuccessFlag('hidden');
    }, 1500);
    setTimeout(() => {
      setDisabled(false);
    }, 1500);

    const isWithinLastWeek = date >= lastWeeksDate && date <= todaysDate;
    if (isWithinLastWeek) {
      getNoteRanges(userId, todaysDate, lastWeeksDate);
    }

    return;
  };

  const getNoteRanges = async (
    userid: string,
    todaysDate: string,
    lastWeeksDate: string
  ) => {
    try {
      const res = await NoteRoutes.getNoteRange(
        userid,
        lastWeeksDate,
        todaysDate
      );

      if (!checkNoteApiResponse(res)) {
        return;
      }

      setNoteError('');
      setnoNotes('');
      setNotes(res as NoteType[]);
    } catch (error) {
      setNoteError('Error Getting Notes');
    }
  };

  const getUserInformation = async () => {
    if (!user) return;
    const res = await NoteRoutes.getUserInfomation(user);
    if (res) {
      const userInfo = JSON.parse(res) as UserInfoResponse;
      setTrackedStats(userInfo?.searchedUser?.settings ?? []);
    }
  };

  const checkNoteApiResponse = (
    notesResponse: NoteType[] | undefined
  ): boolean => {
    if (!notesResponse || notesResponse.length < 1) {
      setNotes([]);
      setnoNotes('No Notes for last week.');
      return false;
    } else {
      return true;
    }
  };

  const renderPropertyCount = (label: string, count: number) => {
    if (count > 0) {
      return (
        <span id="items" key={label}>
          {label}: {count}
        </span>
      );
    }
    return null;
  };

  // Anchors the streak strip to the last day actually present in the
  // currently loaded `notes` — not to real "today" — so switching
  // LookBack's range (a week ago, a year ago, etc.) visibly moves the
  // strip instead of it always showing the same real-world last-7-days
  // window regardless of what's selected below it. Falls back to today
  // only when nothing is loaded (nothing to anchor to).
  const streakAnchorDate = useMemo(() => {
    if (notes.length === 0) {
      return new Date();
    }
    const maxDateStr = notes.reduce(
      (latest, note) => (note.date > latest ? note.date : latest),
      notes[0].date
    );
    return new Date(`${maxDateStr}T00:00:00`);
  }, [notes]);

  const formatShortDate = (iso: string): string =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  // Builds the 7 days ending at streakAnchorDate from notes already in
  // state — no extra request needed, since LookBack already fetched
  // whatever range is currently loaded. A day is a "win" if any note
  // logged that day has one of the WIN_TAGS set.
  const streakDays = useMemo((): StreakDay[] => {
    const days: StreakDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(streakAnchorDate);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayNotes = notes.filter((note) => note.date === iso);
      const hasNote = dayNotes.length > 0;
      const isWin = dayNotes.some((note) => {
        const record = note as unknown as Record<string, unknown>;
        return WIN_TAGS.some((tag) => Boolean(record[tag]));
      });
      days.push({ date: iso, hasNote, isWin });
    }
    return days;
  }, [notes, streakAnchorDate]);

  return (
    <Container id="container">
      <div className="formButtons">
        <CreateNote
          disabled={disabled}
          setTrackedStats={setTrackedStats}
          trackedStats={trackedStats}
          user={user}
          setText={setText}
          text={text}
          storeNewNote={storeNewNote}
        ></CreateNote>
      </div>
      <AlertMessage
        successFlag={successFlag}
        errorFlag={errorFlag}
        successMessage={successMessage}
        errorMessage={errorMessage}
      ></AlertMessage>

      <div className="streakStrip">
        <span className="streakLabel">
          {formatShortDate(streakDays[0].date)} –{' '}
          {formatShortDate(streakDays[6].date)}
        </span>
        <span className="streakRule"></span>
        {streakDays.map((day) => (
          <span
            key={day.date}
            className={
              'streakDot' +
              (day.isWin ? ' win' : day.hasNote ? ' logged' : '')
            }
            title={day.date}
          ></span>
        ))}
      </div>

      <LookBack
        timePeriod={timePeriod}
        setNotes={setNotes}
        setnoNotes={setnoNotes}
        setNoteError={setNoteError}
        setTimePeriod={setTimePeriod}
        setNoteView={setNoteView}
        getNoteRanges={getNoteRanges}
        noteview={noteview}
      ></LookBack>

      <h3 id="pastNoteHeader">{noNotes}</h3>
      <h3 id="pastNoteError">{noteError}</h3>
      <div>
        <div id="count">
          {NOTE_TAG_FIELDS.map(({ field, label }) =>
            renderPropertyCount(label, propertyCounts[field])
          )}
        </div>
        <div className="homeNoteGrid">
          <EditableNoteGrid
            notes={notes}
            currentPage={1}
            open={open}
            modelNoteId={modelNoteId}
            editNote={editNote}
            saveNote={saveNote}
            updateNote={updateNote}
            setNoteValue={setNoteValue}
            setDateNote={setDateNote}
            onStarValueChange={onStarValueChange}
            openModal={openModal}
            closeModal={closeModal}
          />
        </div>
      </div>
    </Container>
  );
};

export { HomeView };