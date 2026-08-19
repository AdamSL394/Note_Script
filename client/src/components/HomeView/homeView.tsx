/* eslint-disable max-len */
import { useAuth0 } from '@auth0/auth0-react';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import React, { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { CreateNote } from '../HomeComponents/CreateNote';
import { LookBack } from '../HomeComponents/LookBack/index';
import { HomeNotes } from '../HomeComponents/NotesHomeView.js';
import { AlertMessage } from '../HomeComponents/SaveNoteAlert/index';
import type { Note as NoteType, TrackedStat, UserInfoResponse } from '../../types';
import './homeView.css';

// Known fields plus an index signature — this object is genuinely
// accessed with dynamic string keys (`counts[property]++`) below, so a
// strict named-fields-only interface would fight the actual usage
// rather than describe it honestly.
interface PropertyCounts {
  gym: number;
  study: number;
  weed: number;
  code: number;
  read: number;
  eatOut: number;
  basketball: number;
  king: number;
  medal: number;
  date_smoosh: number;
  [key: string]: number;
}

const EMPTY_COUNTS: PropertyCounts = {
  gym: 0,
  study: 0,
  weed: 0,
  code: 0,
  read: 0,
  eatOut: 0,
  basketball: 0,
  king: 0,
  medal: 0,
  date_smoosh: 0,
};

// Tags that count as a "win" day for the streak strip's amber dot.
// Kept in sync by convention with CreateNote's WIN_TAGS - both mark the
// same two tracked stats (medal, king) as the app's "win" category.
const WIN_TAGS = ['medal', 'king'];

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
      for (const property in noteRecord) {
        if (property in counts && noteRecord[property]) {
          counts[property]++;
        }
      }
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

  const renderPropertyCount = (property: string, count: number) => {
    if (count > 0) {
      return (
        <span id="items">
          {property}: {count}
        </span>
      );
    }
    return null;
  };

  // Builds the last 7 days for the streak strip from notes already
  // in state (the default fetch on mount already scopes to the last
  // week, so this needs no extra request). A day is a "win" if any
  // note logged that day has one of the WIN_TAGS set.
  const getStreakDays = (): StreakDay[] => {
    const days: StreakDay[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
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
  };

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
        <span className="streakLabel">past 7 days</span>
        <span className="streakRule"></span>
        {getStreakDays().map((day) => (
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
          {propertyNames.map((property) =>
            renderPropertyCount(
              property,
              propertyCounts[property.toLowerCase()]
            )
          )}
        </div>
        <Grid
          container
          spacing={2}
          direction="row"
          justifyContent="center"
          alignItems="flex-start"
        >
          <HomeNotes notes={notes}></HomeNotes>
        </Grid>
      </div>
    </Container>
  );
};

export { HomeView };