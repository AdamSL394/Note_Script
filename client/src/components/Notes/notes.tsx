/* eslint-disable max-len */

import { useAuth0 } from '@auth0/auth0-react';
import { Container } from '@mui/material';
import Pagination from '@mui/material/Pagination/index.js';
import Stack from '@mui/material/Stack/index.js';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import NoteRoutes from '../../router/noteRoutes';
import { EditableNoteGrid } from '../EditableNoteGrid/index';
import { SearchNotes } from '../SearchNotes/searchNotes';
import NoteYears from '../NoteYears/noteYears';
import { useEditableNotes } from '../../hooks/useEditableNotes';
import { useNoteYears } from '../../hooks/useNoteYears';
import type { Note as NoteType } from '../../types';
import './notes.css';

function Notes() {
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
  } = useEditableNotes(setNotes, () => allNotes(currentPage));

  const { noteYears, currentDbCall, setCurrentDBCall, notesYears } =
    useNoteYears(currentPage, (unused, year) =>
      setNotesBasedOnYear(unused, year)
    );

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

  const setSearchedNote = (searchedNotes: NoteType[]) => {
    setNotes(searchedNotes);
  };

  return (
    <div className="notesPageLayout">
      <aside className="yearsSidebarCol">
        <NoteYears
          noteYears={noteYears}
          currentDbCall={currentDbCall}
          notesYears={notesYears}
          currentPage={currentPage}
          setNotesBasedOnYear={setNotesBasedOnYear}
        ></NoteYears>
      </aside>
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
            setNotesBasedOnYear={setNotesBasedOnYear}
            setCurrentDBCall={setCurrentDBCall}
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
        {noNotes && <Box id="noNotes">{noNotes}</Box>}
        {isloading ? (
          // Same "loading…" text treatment App.tsx uses for the auth
          // gate, instead of an external Giphy GIF - no third-party
          // network dependency, and one consistent loading style app-wide.
          <div className="loadingScreen">
            <span className="loadingLabel">loading…</span>
          </div>
        ) : (
          <div className="noteGrid">
            <EditableNoteGrid
              notes={notes}
              currentPage={currentPage}
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
        )}
      </Container>
    </div>
  );
}

export default Notes;