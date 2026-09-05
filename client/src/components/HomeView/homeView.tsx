/* eslint-disable max-len */
import { useAuth0 } from '@auth0/auth0-react';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { sanitizeStarValue } from '../../utils/sanitizeStarValue';
import { CreateNote } from '../HomeComponents/createNote';
import { LookBack } from '../HomeComponents/LookBack/index';
import { HomeNoteCard } from '../HomeComponents/notesHomeView';
import { AlertMessage } from '../HomeComponents/SaveNoteAlert/index';
import EditingNote from '../EditNote/editNote';
import ModalPop from '../Modal/index';
import { useNoteEditing } from '../../hooks/useNoteEditing';
import type { Note as NoteType, TrackedStat, UserInfoResponse } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { toLocalDateString } from '../../utils/date';
import './homeView.css';

// Keyed by the Note schema's actual field names (from NOTE_TAG_FIELDS),
// not a separately hand-typed list. Previously this was its own object
// with a 'study' key that doesn't correspond to any real Note field
// (always stayed 0), and a 'date_smoosh' key that never matched the
// real field name 'date/smoosh' — both were silently dead. Deriving the
// keys from the same shared list everything else uses means this can't
// drift out of sync with what a Note can actually have set on it.
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
  // Deliberately separate from `notes` -- Look Back freely mutates
  // `notes` to show historical content (that's its entire purpose),
  // but the streak strip needs to always reflect genuine current
  // momentum regardless of what's being browsed. Fetched once on mount
  // and refreshed only when a new note is saved within the current
  // week (see storeNewNote), never touched by anything Look Back does.
  const [streakNotes, setStreakNotes] = useState<NoteType[]>([]);
  const [noteview, setNoteView] = useState('week');
  const [timePeriod, setTimePeriod] = useState('1');
  const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
  const [successFlag, setSuccessFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorFlag, setErrorFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [propertyCounts, setPropertyCounts] =
    useState<PropertyCounts>(EMPTY_COUNTS);

  // Auth0's `user.sub` is optional (undefined until authentication
  // resolves), so every call site that needs the derived userId goes
  // through this instead of asserting non-null and hoping.
  const getUserId = (): string | undefined => user?.sub?.split('|')[1];

  const refreshAfterChange = () => {
    const userid = getUserId();
    if (!userid) return;
    const todaysDate = toLocalDateString(new Date());
    const myPastDate = new Date();
    myPastDate.setDate(myPastDate.getDate() - 7);
    const lastWeeksDate = toLocalDateString(myPastDate);
    getNoteRanges(userid, todaysDate, lastWeeksDate);
    fetchStreakData(lastWeeksDate, todaysDate);
  };

  const {
    updateNote,
    saveNote,
    setNoteValue,
    setDateNote,
    openModal,
    closeModal,
    cancelEdit,
    onStarValueChange,
    open,
    modelNoteId,
    saveError,
  } = useNoteEditing(setNotes, refreshAfterChange);

  // Marks a note as being edited in place -- matches Note/index.tsx's
  // existing editNote logic exactly, since EditingNote reads the same
  // sessionStorage-staged-draft convention regardless of which screen
  // opened it.
  const editNote = (note: NoteType) => {
    // Stashed BEFORE entering edit mode so cancelEdit can revert to it
    // -- the live notes array gets mutated on every keystroke via
    // setNoteValue, so without this separate snapshot there'd be no
    // way to recover the pre-edit content once typing starts.
    sessionStorage.setItem(`${note._id}-original`, JSON.stringify(note));
    const noteToEdit: NoteType = {
      ...note,
      star: sanitizeStarValue(note.star),
      textLength: 200 - note.text.length,
      edit: true,
    };
    sessionStorage.setItem(noteToEdit._id, JSON.stringify(noteToEdit));
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n._id === noteToEdit._id ? noteToEdit : n))
    );
  };

  useEffect(() => {
    const userid = getUserId();
    if (!userid || !user) {
      return;
    }
    const todaysDate = toLocalDateString(new Date());
    const myCurrentDate = new Date();
    const myPastDate = new Date(myCurrentDate);
    myPastDate.setDate(myPastDate.getDate() - 7);
    const lastWeeksDate = toLocalDateString(myPastDate);

    async function fetchData() {
      await getNoteRanges(userid as string, todaysDate, lastWeeksDate);
      await fetchStreakData(lastWeeksDate, todaysDate);
      getUserInformation();
    }

    fetchData();
  }, [user]);

  // Fetches the real, current last-7-days data specifically for the
  // streak strip -- see streakNotes above for why this is kept
  // separate from the general notes fetch.
  const fetchStreakData = async (start: string, end: string) => {
    const res = await NoteRoutes.getNoteRange(start, end);
    if (Array.isArray(res)) {
      setStreakNotes(res);
    }
  };

  useEffect(() => {
    if (!saveError) return;
    setErrorMessage(saveError);
    setErrorFlag('visible');
    const timeout = setTimeout(() => setErrorFlag('hidden'), 3000);
    return () => clearTimeout(timeout);
  }, [saveError]);

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
      if (stat.visible === 'visible' && !RESERVED_NOTE_FIELDS.has(stat.name)) {
        raw[stat.name] = true;
      }
    }

    const res = await NoteRoutes.postNote(raw);
    const todaysDate = toLocalDateString(new Date());
    const myCurrentDate = new Date();
    const myPastDate = new Date(myCurrentDate);
    myPastDate.setDate(myPastDate.getDate() - 7);
    const lastWeeksDate = toLocalDateString(myPastDate);

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
      fetchStreakData(lastWeeksDate, todaysDate);
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
    if (!Array.isArray(notesResponse) || notesResponse.length < 1) {
      setNotes([]);
      setnoNotes('Start your streak today.');
      return false;
    } else {
      return true;
    }
  };

  const renderPropertyCount = (icon: string, label: string, count: number) => {
    if (count <= 0) return null;
    return (
      <span id="items" key={label}>
        <span aria-hidden="true">{icon}</span> {label}: {count}
      </span>
    );
  };

  // Builds the last 7 days for the streak strip from streakNotes --
  // deliberately not `notes`, which Look Back mutates freely. Using
  // `notes` here was the actual bug: once Look Back replaced it with
  // historical data, none of those old dates could ever match this
  // week's range, making the strip look frozen/broken rather than
  // genuinely reflecting current momentum.
  const getStreakDays = (): StreakDay[] => {
    const days: StreakDay[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = toLocalDateString(d);
      const dayNotes = streakNotes.filter((note) => note.date === iso);
      const hasNote = dayNotes.length > 0;
      const isWin = dayNotes.some((note) => {
        const record = note as unknown as Record<string, unknown>;
        return WIN_TAGS.some((tag) => Boolean(record[tag]));
      });
      days.push({ date: iso, hasNote, isWin });
    }
    return days;
  };

  // Consecutive win-days counting backward from today. Only 7 days of
  // notes are loaded on this page (the initial fetch scopes to "last
  // week"), so this can only ever report up to 7 -- a real unbounded
  // streak would need more historical data than what's fetched here,
  // which is exactly the kind of thing the deferred calendar-heatmap
  // view should own, not this. Deliberately never claims an exact
  // number it can't back up: {getCurrentStreak, isStreakAtLoadedCap}
  // together let the UI show "7+" instead of falsely implying the
  // streak stops at exactly 7.
  const getCurrentStreak = (): { count: number; atLoadedCap: boolean } => {
    const days = getStreakDays();
    let count = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].isWin) {
        count++;
      } else {
        break;
      }
    }
    return { count, atLoadedCap: count === days.length };
  };

  const streak = getCurrentStreak();

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
        {streak.count > 0 && (
          <span className="streakCount">
            <span aria-hidden="true">🔥</span>{' '}
            {streak.count}{streak.atLoadedCap ? '+' : ''} day streak
          </span>
        )}
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
        {Object.values(propertyCounts).some((count) => count > 0) && (
          <div id="count">
            {NOTE_TAG_FIELDS.map(({ field, icon, label }) =>
              renderPropertyCount(icon, label, propertyCounts[field] ?? 0)
            )}
          </div>
        )}
        <Grid
          container
          spacing={2}
          direction="row"
          justifyContent="center"
          alignItems="flex-start"
        >
          {notes.map((note) => (
            <Grid key={note._id} item xs={12} sm={6} md={4} lg={3}>
              {note.edit ? (
                <EditingNote
                  notes={notes}
                  note={note}
                  setDateNote={setDateNote}
                  currentPage={1}
                  setNoteValue={setNoteValue}
                  saveNote={saveNote}
                  openModal={openModal}
                  updateNote={updateNote}
                  cancelEdit={cancelEdit}
                  onStarValueChange={onStarValueChange}
                ></EditingNote>
              ) : (
                <HomeNoteCard note={note} onEdit={editNote} onDelete={openModal} />
              )}
            </Grid>
          ))}
        </Grid>
      </div>
      <ModalPop
        open={open}
        modelNoteId={modelNoteId}
        closeModal={closeModal}
      ></ModalPop>
    </Container>
  );
};

export { HomeView };