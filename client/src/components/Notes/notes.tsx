/* eslint-disable max-len */

import { useAuth0 } from '@auth0/auth0-react';
import { Container } from '@mui/material';
import Pagination from '@mui/material/Pagination/index.js';
import Stack from '@mui/material/Stack/index.js';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import EditingNote from '../EditNote/editingNote';
import ModalPop from '../Modal/index';
import { NoteCard } from '../NoteCard/index';
import { SearchNotes } from '../SearchNotes/searchNotes';
import type { Note as NoteType } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import './notes.css';

interface NotesProps {
  // Bound to a MUI <Select>'s onChange (see editingNote.tsx), not a
  // plain input — SelectChangeEvent is the correct type here.
  onStarValueChange: (e: SelectChangeEvent, note: NoteType) => void;
}

function Notes(props: NotesProps) {
  const postPerPage = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const { user } = useAuth0();
  // 'All' | 'Recently Changed' | 'Search' | 'Date Range' | a year (as a
  // number, per how NoteYears builds its year list) — kept loose to
  // match what's actually pushed through this value, rather than
  // over-promising a strict string union that the rest of the app
  // doesn't actually honor yet.
  const [currentCall, setCurrentCall] = useState<string | number>('All');
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [open, setOpen] = useState(false);
  const [modelNoteId, setModelNoteId] = useState<string | undefined>();
  const [isloading, setIsLoading] = useState(false);
  const [searchedNotesResults, setSearchNoteResults] = useState<NoteType[]>(
    []
  );
  const [dateaRangeNotesResults, setDateaRangeNoteResults] = useState<
    NoteType[] | undefined
  >();
  const [noNotes, setNoNotes] = useState<string | undefined>();

  // Auth0's `user.sub` is typed as optional by @auth0/auth0-react (it's
  // undefined until authentication resolves), so every call site that
  // needs the derived userId goes through this instead of asserting
  // `user!.sub` and hoping — if it's ever actually missing, callers get
  // undefined back and can bail out explicitly rather than throwing.
  const getUserId = (): string | undefined => user?.sub?.split('|')[1];

  useEffect(() => {
    // Without this guard, allNotes() can run before `user` exists and
    // silently no-op (via getUserId's undefined) instead of loading data.
    if (!user) {
      return;
    }
    allNotes(1);
  }, [user]);

  // Every call site in this file always passes an explicit page number —
  // there's no case that needs to "reuse whatever the current page
  // already is." So this can always set state directly and use the
  // parameter for the slice math, instead of the old pattern of
  // reassigning the outer `currentPage` variable as a same-tick
  // workaround for React's async state updates.
  const slicePosts = (getNotes: NoteType[], page: number): NoteType[] => {
    setCurrentPage(page);
    const indexOfLastPost = page * postPerPage;
    const indexOfFirstPost = indexOfLastPost - postPerPage;
    return getNotes.slice(indexOfFirstPost, indexOfLastPost);
  };

  // Stages a note for editing: computes the remaining-character budget,
  // marks it editable, and persists the draft so EditingNote/Textarea
  // can pick it back up. Moved here from the old Note component so all
  // note-mutation logic (save, edit, update, delete) lives in one place
  // instead of being split across the card renderer and its parent.
  const editNote = (note: NoteType) => {
    const noteToEdit: NoteType = {
      ...note,
      textLength: 200 - note.text.length,
      edit: true,
    };
    sessionStorage.setItem(noteToEdit._id, JSON.stringify(noteToEdit));
    updateNote(noteToEdit);
  };

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

  const getNoteYears = async (year: string | number, value: number) => {
    setIsLoading(true);
    const userid = getUserId();
    if (!userid) {
      setIsLoading(false);
      return;
    }
    const noteYears = await NoteRoutes.getNoteRangeYear(
      userid,
      year + '-12-' + '31',
      year + '-01-' + '01'
    );
    if (!checkNoteApiResponse(noteYears)) {
      return;
    }
    setIsLoading(false);
    const currentPosts = slicePosts(noteYears as NoteType[], value);
    setNotes(currentPosts);
    setNumberOfPages(Math.ceil((noteYears as NoteType[]).length / postPerPage));
  };

  const setNotesBasedOnYear = async (
    _unused: unknown,
    year: string | number
  ) => {
    await determineApiCall(year, 1);
  };

  const allNotes = async (value: number) => {
    setIsLoading(true);
    const userid = getUserId();
    if (!userid) {
      setIsLoading(false);
      return;
    }
    const getNotes = await NoteRoutes.getAllNotes(userid);

    if (!checkNoteApiResponse(getNotes)) {
      return;
    }
    setIsLoading(false);
    const currentPosts = slicePosts(getNotes, value);
    setNotes(currentPosts);
    setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
    return;
  };

  const handleChange = async (
    _e: React.ChangeEvent<unknown>,
    value: number
  ) => {
    await determineApiCall(currentCall, value);
  };

  const openModal = (note: NoteType) => {
    setModelNoteId(note._id);
    setOpen(true);
  };

  const closeModal = async (note: string | 'Cancel') => {
    if (note !== 'Cancel') {
      setOpen(false);
      await NoteRoutes.deleteNote(note);
      allNotes(currentPage);
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
      return;
    }
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

  const getNoteRange = async (userId: string, start: string, end: string) => {
    if (start > end) {
      return;
    }
    if (!start || !end) {
      return;
    }
    setIsLoading(true);
    const noteDateRange = await NoteRoutes.getNoteRange(userId, start, end);
    setIsLoading(false);
    setDateaRangeNoteResults(noteDateRange);
    setCurrentCall('Date Range');
    const currentPosts = slicePosts(noteDateRange ?? [], 1);
    setNumberOfPages(Math.ceil((noteDateRange ?? []).length / postPerPage));
    setNotes(currentPosts);
  };

  // Previously reached into the DOM directly (document.getElementById)
  // to toggle the "no notes" banner's display style, fighting React's
  // own state-driven rendering of the same element. Now `noNotes` alone
  // is the source of truth: the JSX below renders the banner only when
  // it's non-empty, so setting state is the only thing this needs to do.
  const checkNoteApiResponse = (
    notesResponse: NoteType[] | null | undefined
  ): boolean => {
    if (!notesResponse || notesResponse.length < 1) {
      setNoNotes('Get started... Upload or make your first Note!');
      setIsLoading(false);
      setNotes([]);
      return false;
    }
    setNoNotes('');
    return true;
  };

  const determineApiCall = async (
    stringApiCall: string | number,
    value: number
  ) => {
    switch (stringApiCall) {
      case 'All': {
        const userid = getUserId();
        if (!userid) return;
        setCurrentCall('All');
        setIsLoading(true);
        const getNotes = await NoteRoutes.getAllNotes(userid);
        if (!checkNoteApiResponse(getNotes)) {
          return;
        }
        setIsLoading(false);
        const currentPosts = slicePosts(getNotes, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
        break;
      }
      case 'Recently Changed': {
        const userid = getUserId();
        if (!userid) return;
        setCurrentCall('Recently Changed');
        setIsLoading(true);
        const getNotes = await NoteRoutes.getRecentlyUpdatedNotes(userid);
        if (!checkNoteApiResponse(getNotes)) {
          return;
        }
        setIsLoading(false);
        const currentPosts = slicePosts(getNotes, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(getNotes.length / postPerPage));
        break;
      }
      case 'Search': {
        const currentPosts = slicePosts(searchedNotesResults, value);
        setNotes(currentPosts);
        setNumberOfPages(Math.ceil(searchedNotesResults.length / postPerPage));
        break;
      }
      case 'Date Range': {
        const currentPosts = slicePosts(dateaRangeNotesResults ?? [], value);
        setNotes(currentPosts);
        setNumberOfPages(
          Math.ceil((dateaRangeNotesResults ?? []).length / postPerPage)
        );
        break;
      }
      default: {
        setCurrentCall(stringApiCall);
        getNoteYears(stringApiCall, value);
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

  return (
    <>
      <ModalPop
        note={notes}
        open={open}
        modelNoteId={modelNoteId}
        closeModal={closeModal}
      ></ModalPop>
      <Container style={{ maxWidth: '100%', marginBottom: '1rem' }}>
        <Box id='searchStyle' style={{ maxWidth: '90%'}}>
          <SearchNotes
            setCurrentPage={setCurrentPage}
            getNoteRange={getNoteRange}
            setCurrentCall={setCurrentCall}
            slicePosts={slicePosts}
            setSearchNoteResults={setSearchNoteResults}
            setNumberOfPages={setNumberOfPages}
            setSearchedNote={setSearchedNote}
            currentPage={currentPage}
            setNotesBasedOnYear={setNotesBasedOnYear}
          ></SearchNotes>
        </Box>
        <Stack className="stack">
          <Pagination
            page={currentPage}
            count={numberOfPages}
            onChange={handleChange}
            defaultPage={1}
            color="primary"
          ></Pagination>
        </Stack>
      </Container>
      {noNotes && <Box id="noNotes">{noNotes}</Box>}
      {isloading ? (
        // Same "loading…" text treatment App.tsx uses for the auth
        // gate, instead of an external Giphy GIF - no third-party
        // network dependency, and one consistent loading style app-wide.
        <div className="loadingScreen">
          <span className="loadingLabel">loading…</span>
        </div>
      ) : (
        <>
          {notes.map((note) => {
            if (!note.edit) {
              return (
                <NoteCard
                  key={note._id}
                  note={note}
                  onEdit={editNote}
                  onDelete={openModal}
                />
              );
            }
            if (note.edit) {
              // Compute textLength without mutating the state object
              // during render — pass it through as part of a new object
              // instead.
              const textLength =
                note.textLength !== undefined
                  ? note.textLength
                  : 200 - note.text.length;
              return (
                <EditingNote
                  key={note._id}
                  notes={notes}
                  note={{ ...note, textLength }}
                  setDateNote={setDateNote}
                  currentPage={currentPage}
                  setNoteValue={setNoteValue}
                  saveNote={saveNote}
                  openModal={openModal}
                  updateNote={updateNote}
                  onStarValueChange={props.onStarValueChange}
                ></EditingNote>
              );
            }
            return null;
          })}
        </>
      )}
    </>
  );
}

export default Notes;