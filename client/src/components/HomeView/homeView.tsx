/* eslint-disable max-len */
import { useAuth0 } from '@auth0/auth0-react';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { sanitizeStarValue } from '../../utils/sanitizeStarValue';
import { capitalizeChecklistText } from '../../utils/capitalizeChecklistText';
import { CreateNote } from '../HomeComponents/createNote';
import { LookBack } from '../HomeComponents/LookBack/index';
import { HomeNoteCard } from '../HomeComponents/notesHomeView';
import { ScrollableChipRow } from '../ScrollableChipRow/index';
import { AlertMessage } from '../HomeComponents/SaveNoteAlert/index';
import EditingNote from '../EditNote/editNote';
import ModalPop from '../Modal/index';
import { useNoteEditing } from '../../hooks/useNoteEditing';
import type { Note as NoteType, TrackedStat, UserInfoResponse, ChecklistItem } from '../../types';
import { WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { toLocalDateString } from '../../utils/date';
import './homeView.css';

// Keyed by the Note schema's actual field names (from NOTE_TAG_FIELDS),
// not a separately hand-typed list. Previously this was its own object
// with a 'study' key that doesn't correspond to any real Note field
// (always stayed 0), and a 'date_smoosh' key that never matched the
// real field name 'date/smoosh' — both were silently dead. Deriving the
// keys from the same shared list everything else uses means this can't
// drift out of sync with what a Note can actually have set on it.
interface PropertyCount {
  count: number;
  icon: string;
}
type PropertyCounts = Record<string, PropertyCount>;

const HomeView = () => {
  const { user } = useAuth0();
  const [noNotes, setnoNotes] = useState<string | undefined>();
  const [noteError, setNoteError] = useState<string | undefined>();
  const [text, setText] = useState<string | undefined>();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  const [disabled, setDisabled] = useState(false);

  const [notes, setNotes] = useState<NoteType[]>([]);
  const [noteview, setNoteView] = useState('week');
  const [timePeriod, setTimePeriod] = useState('1');
  const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
  const [hasSeenOnboardingDemo, setHasSeenOnboardingDemo] = useState(true);
  const [successFlag, setSuccessFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorFlag, setErrorFlag] = useState<'visible' | 'hidden'>('hidden');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [propertyCounts, setPropertyCounts] =
    useState<PropertyCounts>({});

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

  // Toggle/edit/remove a single checklist item on an already-saved
  // note -- all three reuse the same updateNote (from useNoteEditing)
  // that tag toggles already go through: build the new checklist
  // array immutably, send the whole note through, let the server's
  // response (source of truth) land back in state.
  const toggleChecklistItem = (note: NoteType, index: number) => {
    const nextChecklist = (note.checklist ?? []).map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    // star must be run through sanitizeStarValue here too -- some older
    // notes still carry a legacy non-enum `star` (e.g. a raw boolean)
    // that would otherwise be sent straight back to the server as-is,
    // failing its star enum validation and silently rejecting the
    // *whole* update (checklist change included), with nothing surfaced
    // to the user. saveNote/cancelEdit/editNote already guard against
    // this; these three checklist handlers didn't.
    updateNote({ ...note, star: sanitizeStarValue(note.star), checklist: nextChecklist });
  };

  const removeChecklistItem = (note: NoteType, index: number) => {
    const nextChecklist = (note.checklist ?? []).filter((_, i) => i !== index);
    updateNote({ ...note, star: sanitizeStarValue(note.star), checklist: nextChecklist });
  };

  const editChecklistItemText = (note: NoteType, index: number, text: string) => {
    const nextChecklist = (note.checklist ?? []).map((item, i) =>
      i === index ? { ...item, text: capitalizeChecklistText(text) } : item
    );
    updateNote({ ...note, star: sanitizeStarValue(note.star), checklist: nextChecklist });
  };

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
      await getUserInformation();
      await getNoteRanges(userid as string, todaysDate, lastWeeksDate);
    }

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!saveError) return;
    setErrorMessage(saveError);
    setErrorFlag('visible');
    const timeout = setTimeout(() => setErrorFlag('hidden'), 3000);
    return () => clearTimeout(timeout);
  }, [saveError]);

  useEffect(() => {
    const counts: PropertyCounts = {};
    notes.forEach((note) => {
      (note.tags ?? []).forEach((tag) => {
        const existing = counts[tag.name];
        counts[tag.name] = { count: (existing?.count ?? 0) + 1, icon: tag.icon };
      });
    });
    setPropertyCounts(counts);
  }, [notes]);

  const storeNewNote = async (
    stats: TrackedStat[],
    date: string | undefined,
    checklistToSave: ChecklistItem[]
  ) => {
    const userId = getUserId();
    if (!userId) {
      return;
    }
    setDisabled(true);

    // A note only needs a real checklist item or two, not necessarily
    // free-text -- validation checks either, not text specifically.
    const hasText = Boolean(text && text.trim().length > 0);
    const hasChecklistItem = checklistToSave.some((item) => item.text.trim().length > 0);

    const raw: Record<string, unknown> = {
      text: text ?? '',
      date,
    };
    if ((!hasText && !hasChecklistItem) || !date) {
      setErrorMessage('Please add some text or a checklist item, and set a date');
      setErrorFlag('visible');
      setTimeout(() => {
        setErrorFlag('hidden');
        setDisabled(false);
      }, 2000);
      return;
    }

    const tags = stats
      .filter((stat) => stat.visible === 'visible' && !RESERVED_NOTE_FIELDS.has(stat.name))
      .map((stat) => ({ name: stat.name, icon: stat.icon }));
    raw.tags = tags;
    raw.checklist = checklistToSave;

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
    setChecklist([]);
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
      setHasSeenOnboardingDemo(userInfo?.searchedUser?.hasSeenOnboardingDemo ?? true);
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
      <span className="weeklyTagChip" key={label}>
        <span aria-hidden="true">{icon}</span> {label}: {count}
      </span>
    );
  };

  // Human-readable label for whatever Look Back period is currently
  // selected -- noteview distinguishes singular ('week'/'year', only
  // ever paired with timePeriod === '1') from plural ('weeks'/'years'),
  // so this covers every combination Look Back can actually produce
  // (1/2/3 weeks ago, 1/2/3 years ago) without needing its own
  // separate state.
  const getLookBackLabel = (): string => {
    if (noteview === 'week') return 'the past week';
    if (noteview === 'year') return '1 year ago';
    if (noteview === 'weeks') return `${timePeriod} weeks ago`;
    return `${timePeriod} years ago`;
  };

  // Counts total notes and win-tagged notes directly from whatever
  // Look Back has currently loaded into `notes` -- this is what makes
  // the highlight genuinely reflect the selected period (7 days, 2
  // weeks, a year ago, whatever) rather than always showing a fixed
  // "last real 7 days" window regardless of what's being browsed.
  const getLookBackSummary = (): { total: number; wins: number } => {
    const total = notes.length;
    const wins = notes.filter((note) =>
      WIN_TAGS.some((tag) => (note.tags ?? []).some((t) => t.name === tag))
    ).length;
    return { total, wins };
  };

  const lookBackSummary = getLookBackSummary();

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
          checklist={checklist}
          setChecklist={setChecklist}
          storeNewNote={storeNewNote}
          hasSeenOnboardingDemo={hasSeenOnboardingDemo}
        ></CreateNote>
      </div>
      <AlertMessage
        successFlag={successFlag}
        errorFlag={errorFlag}
        successMessage={successMessage}
        errorMessage={errorMessage}
      ></AlertMessage>

      <div className="weeklyWidget">
        {/* Two stacked rows instead of one long one. The stat/win-badge
            group and the Look Back control are both fixed-width, "read
            this fact" pieces, so they share a top row sized to their
            own content. Tag chips are open-ended -- there can be one
            tag or a dozen -- so they get their own full-width row
            underneath instead of fighting the top row's other pieces
            for whatever space is left over on the right. At any fixed
            card width (let alone a wide desktop viewport, where this
            card doesn't grow to fill the screen) that leftover space
            could end up a lot smaller than the chip row actually
            needed. */}
        <div className="weeklyWidgetTopRow">
          {/* Stat + win badge are grouped into their own always-row
              flex unit so they stay on one line together even once
              ".weeklyWidgetTopRow" stacks to flex-direction:column on
              narrow screens -- previously each was a direct child of
              that column, so the two landed on separate stacked lines
              there instead of side by side. */}
          <div className="weeklyStatRow">
            <div className="weeklyStat">
              <span className="weeklyStatNumber">{lookBackSummary.total}</span>
              <span className="weeklyStatLabel">
                note{lookBackSummary.total === 1 ? '' : 's'}, {getLookBackLabel()}
              </span>
            </div>

            {lookBackSummary.wins > 0 && (
              <>
                <div className="weeklyDivider" aria-hidden="true"></div>
                <div className="weeklyWinBadge">
                  <span className="weeklyWinIcon" aria-hidden="true">🔥</span>
                  <span className="weeklyWinCount">
                    {lookBackSummary.wins} win{lookBackSummary.wins === 1 ? '' : 's'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="weeklyDivider" aria-hidden="true"></div>

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
        </div>

        {Object.values(propertyCounts).some(({ count }) => count > 0) && (
          <div className="weeklyWidgetTagRow">
            <ScrollableChipRow ariaLabel="tag counts for this period">
              {Object.entries(propertyCounts)
                .filter(([, { count }]) => count > 0)
                .map(([tagName, { count, icon }]) => renderPropertyCount(icon, tagName, count))}
            </ScrollableChipRow>
          </div>
        )}
      </div>

      <h3 id="pastNoteHeader">{noNotes}</h3>
      <h3 id="pastNoteError">{noteError}</h3>
      <div>
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
                  trackedStats={trackedStats}
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
                <HomeNoteCard
                  note={note}
                  onEdit={editNote}
                  onDelete={openModal}
                  onToggleChecklistItem={toggleChecklistItem}
                  onRemoveChecklistItem={removeChecklistItem}
                  onEditChecklistItemText={editChecklistItemText}
                />
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