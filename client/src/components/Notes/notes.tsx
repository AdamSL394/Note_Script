/* eslint-disable max-len */

import { useAuth0 } from '@auth0/auth0-react';
import { Container } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress/index.js';
import { Box } from '@mui/system';
import React, { useEffect, useRef, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { sanitizeStarValue } from '../../utils/sanitizeStarValue';
import EditingNote from '../EditNote/editNote';
import ModalPop from '../Modal/index';
import Note from '../Note/index';
import NoteYears from '../NoteYears/noteYears';
import Snackbar from '@mui/material/Snackbar/index.js';
import Alert from '@mui/material/Alert/index.js';
import { SearchNotes } from '../SearchNotes/searchNotes';
import { useNoteYears } from '../../hooks/useNoteYears';
import type { Note as NoteType } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import './notes.css';

interface NotesProps {
  // Bound to a MUI <Select>'s onChange (see editNote.tsx), not a
  // plain input — SelectChangeEvent is the correct type here.
  onStarValueChange: (e: SelectChangeEvent, note: NoteType) => void;
}

interface MonthGroup {
  label: string;
  notes: NoteType[];
}

// Groups an already-sorted (most recent first) notes array by
// calendar month for rendering. Uses a Map for its guaranteed
// insertion-order iteration -- since the input is already sorted
// descending, the groups come out in the correct order for free,
// without needing to separately sort the group keys.
function groupByMonth(notesList: NoteType[]): MonthGroup[] {
  const groups = new Map<string, NoteType[]>();
  for (const note of notesList) {
    const [year, month] = note.date.split('-');
    const key = `${year}-${month}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(note);
    } else {
      groups.set(key, [note]);
    }
  }
  return Array.from(groups.entries()).map(([key, notesInMonth]) => {
    const [year, month] = key.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    return { label, notes: notesInMonth };
  });
}

const NOTES_PER_BATCH = 30;

function Notes(props: NotesProps) {
  const [notes, setNotes] = useState<NoteType[]>([]);
  const { user } = useAuth0();
  // 'All' | 'Recently Changed' | 'Search' | 'Date Range' | a year (as a
  // number, per how NoteYears builds its year list) — kept loose to
  // match what's actually pushed through this value, rather than
  // over-promising a strict string union that the rest of the app
  // doesn't actually honor yet.
  // Defaults to the current year rather than 'All' -- landing on the
  // entire all-time history immediately (with infinite scroll going
  // back years) is a less useful first view than starting focused on
  // this year, matching how the year sidebar is the primary navigation
  // model anyway.
  const currentYear = new Date().getFullYear();
  const [currentCall, setCurrentCall] = useState<string | number>(currentYear);
  const [open, setOpen] = useState(false);
  const [modelNoteId, setModelNoteId] = useState<string | undefined>();
  const [isloading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noNotes, setNoNotes] = useState<string | undefined>();

  // Only meaningful for 'All' mode -- the one mode with true
  // server-side pagination. Every other mode fetches its complete
  // result set in a single call, so there is never more to load for
  // them once the initial fetch lands.
  const [hasMore, setHasMore] = useState(true);
  const nextPageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [saveError, setSaveError] = useState<string | undefined>();

  // Auth0's `user.sub` is typed as optional by @auth0/auth0-react (it's
  // undefined until authentication resolves), so every call site that
  // needs the derived userId goes through this instead of asserting
  // `user!.sub` and hoping — if it's ever actually missing, callers get
  // undefined back and can bail out explicitly rather than throwing.
  const getUserId = (): string | undefined => user?.sub?.split('|')[1];

  useEffect(() => {
    // Without this guard, getNoteYears() can run before `user` exists
    // and silently no-op (via getUserId's undefined) instead of
    // loading data.
    if (!user) {
      return;
    }
    getNoteYears(currentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Saves whatever draft exists in sessionStorage for this note (or the
  // note itself if no draft was staged), without mutating either.
  const saveNote = (note: NoteType) => {
    const rawDraft = sessionStorage.getItem(note._id);
    const draftNote: NoteType | null = rawDraft ? JSON.parse(rawDraft) : null;
    const noteToSave: NoteType = draftNote
      ? { ...draftNote, edit: false }
      : { ...note, edit: false };
    sessionStorage.setItem(noteToSave._id, JSON.stringify(noteToSave));
    updateNote(noteToSave);
  };

  const getNoteYears = async (year: string | number, direction: 'asc' | 'desc' = sortDirection) => {
    setIsLoading(true);
    const userid = getUserId();
    if (!userid) {
      setIsLoading(false);
      return;
    }
    const noteYears = await NoteRoutes.getNoteRangeYear(
      year + '-12-31',
      year + '-01-01',
      direction
    );
    setIsLoading(false);
    setHasMore(false);
    if (!checkNoteApiResponse(noteYears)) {
      return;
    }
    setNotes(noteYears as NoteType[]);
  };

  const setNotesBasedOnYear = async (
    _unused: unknown,
    year: string | number
  ) => {
    await determineApiCall(year);
  };

  // The only mode with true server-side pagination -- fetches one
  // batch and REPLACES the list (used for the initial load and
  // whenever switching back into 'All' mode from something else).
  const loadAllNotes = async (direction: 'asc' | 'desc' = sortDirection) => {
    setIsLoading(true);
    const userid = getUserId();
    if (!userid) {
      setIsLoading(false);
      return;
    }
    setCurrentCall('All');
    const { notes: pageNotes, totalCount } = await NoteRoutes.getAllNotes(
      1,
      NOTES_PER_BATCH,
      direction
    );
    setIsLoading(false);
    if (!checkNoteApiResponse(pageNotes)) {
      return;
    }
    setNotes(pageNotes);
    nextPageRef.current = 2;
    setHasMore(pageNotes.length < totalCount);
  };

  // Fetches the next batch and APPENDS it -- this is the actual
  // infinite-scroll driver, called by the IntersectionObserver below
  // when the sentinel at the bottom of the list comes into view.
  // Guarded by isLoadingMore so a fast scroll can't fire this twice
  // concurrently and append the same batch or race two requests.
  const loadMoreAllNotes = async () => {
    if (isLoadingMore || !hasMore) return;
    const userid = getUserId();
    if (!userid) return;
    setIsLoadingMore(true);
    const { notes: pageNotes, totalCount } = await NoteRoutes.getAllNotes(
      nextPageRef.current,
      NOTES_PER_BATCH,
      sortDirection
    );
    setIsLoadingMore(false);
    if (!Array.isArray(pageNotes)) {
      // A failed "load more" (rate limit, network issue, any other
      // error) shouldn't wipe out notes already loaded and showing --
      // just stop trying to load more, leaving what's already there.
      setHasMore(false);
      return;
    }
    setNotes((prev) => {
      const combined = [...prev, ...pageNotes];
      setHasMore(combined.length < totalCount);
      return combined;
    });
    nextPageRef.current += 1;
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentCall === 'All') {
          loadMoreAllNotes();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCall, hasMore, isLoadingMore]);

  const openModal = (note: NoteType) => {
    setModelNoteId(note._id);
    setOpen(true);
  };

  const closeModal = async (note: string | 'Cancel') => {
    if (note !== 'Cancel') {
      setOpen(false);
      await NoteRoutes.deleteNote(note);
      setNotes((prev) => prev.filter((n) => n._id !== note));
    }
    if (note === 'Cancel') {
      setOpen(false);
    }
  };

  // Applies the server's response (the source of truth after an update)
  // to the matching note in state, instead of discarding it.
  const updateNote = async (note: NoteType) => {
    const updatedNoteFromServer = await NoteRoutes.updateNote(note);
    if (!updatedNoteFromServer || !updatedNoteFromServer._id) {
      setSaveError('Something went wrong saving your changes. Please try again.');
      return;
    }
    setSaveError(undefined);
    // Trust whatever `edit` value the server echoes back — don't force
    // it to false here. updateNote is called both to *save* a note
    // (saveNote sends edit: false) and to *open* one for editing
    // (Note/index.js's editNote sends edit: true). Hardcoding false here
    // would silently kick a note back out of edit mode the instant you
    // opened it.
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n._id === updatedNoteFromServer._id ? updatedNoteFromServer : n
      )
    );
  };

  // Closes edit mode WITHOUT saving whatever was typed -- discards the
  // staged draft and restores the pristine pre-edit snapshot (see
  // editNote in Note/index.tsx), rather than committing partial
  // changes or leaving the note stuck in edit mode with no way out.
  const cancelEdit = (note: NoteType) => {
    const rawOriginal = sessionStorage.getItem(`${note._id}-original`);
    sessionStorage.removeItem(note._id);
    sessionStorage.removeItem(`${note._id}-original`);
    if (rawOriginal) {
      const original: NoteType = JSON.parse(rawOriginal);
      updateNote({ ...original, star: sanitizeStarValue(original.star), edit: false });
    } else {
      // No snapshot exists for some reason -- exit edit mode on
      // whatever is currently there rather than leaving it stuck.
      updateNote({ ...note, star: sanitizeStarValue(note.star), edit: false });
    }
  };

  const getNoteRange = async (userId: string, start: string, end: string) => {
    if (start > end) {
      return;
    }
    if (!start || !end) {
      return;
    }
    setIsLoading(true);
    const noteDateRange = await NoteRoutes.getNoteRange(start, end, sortDirection);
    setIsLoading(false);
    setCurrentCall('Date Range');
    setHasMore(false);
    if (!checkNoteApiResponse(noteDateRange)) {
      return;
    }
    setNotes(noteDateRange ?? []);
  };

  const checkNoteApiResponse = (
    notesResponse: NoteType[] | null | undefined
  ): boolean => {
    const noNotesElement = document.getElementById('noNotes');
    if (!Array.isArray(notesResponse) || notesResponse.length < 1) {
      if (noNotesElement) {
        noNotesElement.style.display = 'grid';
      }
      setNoNotes('No notes here yet. Write one from Home, or upload your history to get started.');
      setIsLoading(false);
      setNotes([]);
      return false;
    } else {
      if (noNotesElement) {
        noNotesElement.style.display = 'none';
      }
      setNoNotes('');
      return true;
    }
  };

  const determineApiCall = async (stringApiCall: string | number) => {
    switch (stringApiCall) {
      case 'All': {
        await loadAllNotes();
        break;
      }
      case 'Recently Changed': {
        const userid = getUserId();
        if (!userid) return;
        setCurrentCall('Recently Changed');
        setIsLoading(true);
        const getNotes = await NoteRoutes.getRecentlyUpdatedNotes();
        setIsLoading(false);
        setHasMore(false);
        if (!checkNoteApiResponse(getNotes)) {
          return;
        }
        setNotes(getNotes);
        break;
      }
      default: {
        setCurrentCall(stringApiCall);
        getNoteYears(stringApiCall);
        break;
      }
    }
  };

  // Accepts an optional updated note for a proper immutable replace.
  // Falls back to the old "just re-render" behavior when called with no
  // argument, since Textarea.js still relies on mutating props.note
  // directly and just needs a nudge to re-render — that's a separate,
  // larger fix left for its own session (see notes on Textarea.js).
  const setNoteValue = (updatedNote?: NoteType) => {
    if (updatedNote && updatedNote._id) {
      setNotes((prevNotes) =>
        prevNotes.map((n) => (n._id === updatedNote._id ? updatedNote : n))
      );
      return;
    }
    setNotes((prevNotes) => [...prevNotes]);
  };

  const setSearchedNote = (searchedNotes: NoteType[]) => {
    setCurrentCall('Search');
    setHasMore(false);
    if (!checkNoteApiResponse(searchedNotes)) {
      return;
    }
    setNotes(searchedNotes);
  };

  // Merges in any staged draft, then updates the date without mutating
  // the note object or relying on shared-reference mutation to sync UI.
  const setDateNote = (
    e: React.ChangeEvent<HTMLInputElement>,
    note: NoteType
  ) => {
    const rawStored = sessionStorage.getItem(note._id);
    const storedNote: NoteType | null = rawStored ? JSON.parse(rawStored) : null;
    const updatedNote: NoteType = storedNote
      ? { ...storedNote, date: e.target.value }
      : { ...note, date: e.target.value };
    sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n._id === note._id ? updatedNote : n))
    );
  };

  // Owns the year-sidebar's data and selection state. Selecting a year
  // routes into the same determineApiCall the search flow already uses.
  const { noteYears, currentDbCall, setCurrentDbCall, selectYear } =
    useNoteYears((year) => determineApiCall(year));

  const toggleSortDirection = () => {
    const newDirection: 'asc' | 'desc' = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(newDirection);

    if (currentCall === 'All') {
      loadAllNotes(newDirection);
      return;
    }

    // Every other mode (year browsing, date range, search, recently
    // changed) already fetches its complete result set in a single
    // call -- reversing the already-loaded array locally is exactly
    // equivalent to re-fetching with the opposite sort, without the
    // round-trip.
    setNotes((prev) => [...prev].reverse());
  };

  const monthGroups = groupByMonth(notes);

  return (
    <>
      <Snackbar
        open={Boolean(saveError)}
        autoHideDuration={4000}
        onClose={() => setSaveError(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={() => setSaveError(undefined)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', borderRadius: '8px' }}
        >
          {saveError}
        </Alert>
      </Snackbar>
      <ModalPop
        note={notes}
        open={open}
        modelNoteId={modelNoteId}
        closeModal={closeModal}
      ></ModalPop>
      <div className="notesLayout">
        <NoteYears
          noteYears={noteYears}
          currentSelection={currentDbCall}
          onSelectYear={selectYear}
        ></NoteYears>
        <div className="notesMain">
          <Container style={{ maxWidth: '100%', marginBottom: '1rem' }}>
            <Box id='searchStyle' style={{ width: '100%' }}>
              <SearchNotes
                getNoteRange={getNoteRange}
                setSearchedNote={setSearchedNote}
                setNotesBasedOnYear={setNotesBasedOnYear}
                setCurrentDbCall={setCurrentDbCall}
                sortDirection={sortDirection}
                onToggleSortDirection={toggleSortDirection}
                showSortToggle={!isloading && notes.length > 0}
              ></SearchNotes>
            </Box>
          </Container>
          <Box id="noNotes">{noNotes}</Box>
          {isloading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {monthGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  <p className={groupIndex === 0 ? 'monthHeader monthHeaderFirst' : 'monthHeader'}>
                    {group.label}
                  </p>
                  <div className="noteGrid">
                    {group.notes.map((note, i) => {
                      if (!note.edit) {
                        return (
                          <Note
                            key={note._id ?? i}
                            note={note}
                            openModal={openModal}
                            updateNote={updateNote}
                          ></Note>
                        );
                      }
                      // Compute textLength without mutating the state
                      // object during render — pass it through as
                      // part of a new object instead.
                      const textLength =
                        note.textLength !== undefined
                          ? note.textLength
                          : 200 - note.text.length;
                      return (
                        <EditingNote
                          key={note._id ?? i}
                          notes={notes}
                          note={{ ...note, textLength }}
                          setDateNote={setDateNote}
                          currentPage={1}
                          setNoteValue={setNoteValue}
                          saveNote={saveNote}
                          openModal={openModal}
                          updateNote={updateNote}
                          cancelEdit={cancelEdit}
                          onStarValueChange={props.onStarValueChange}
                        ></EditingNote>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={sentinelRef} style={{ height: '1px' }}></div>
              {isLoadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Notes;