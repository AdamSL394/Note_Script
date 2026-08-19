import React, { useEffect, useState } from 'react';
import Search from '../Search/search';
import { useAuth0 } from '@auth0/auth0-react';
import { DateRange } from '../DateRange/index';
import NoteYears, { NotesYearsCallbackProps } from '../NoteYears/noteYears';
import NoteRoutes from '../../router/noteRoutes';
import type { Note } from '../../types';

interface SearchNotesProps {
  setCurrentPage: (page: number) => void;
  getNoteRange: (userId: string, start: string, end: string) => Promise<void>;
  setCurrentCall: (call: string | number) => void;
  slicePosts: (notes: Note[], page: number) => Note[];
  setSearchNoteResults: (notes: Note[]) => void;
  setNumberOfPages: (pages: number) => void;
  setSearchedNote: (notes: Note[]) => void;
  currentPage: number;
  setNotesBasedOnYear: (unused: unknown, year: string | number) => void;
}

interface OldestNoteYearResult {
  _id: string;
}

export const SearchNotes = (props: SearchNotesProps) => {
  const [noteYears, setNoteYears] = useState<(string | number)[]>([]);
  const { user } = useAuth0();
  const [currentDbCall, setCurrentDBCall] = useState<string | number>('All');

  useEffect(() => {
    // Auth0's `user` is undefined until authentication resolves. Without
    // this guard, getNoteYears() can run before `user` exists and throw
    // on `user.sub` inside NoteRoutes.
    if (!user) {
      return;
    }
    getNoteYears();
  }, [user]);

  const searchNotes = async (searchedNotes: Note[], searchTerm: string) => {
    props.setSearchNoteResults(searchedNotes);
    if (searchTerm.length === 0) {
      props.setSearchNoteResults([]);
      setCurrentDBCall('All');
      props.setNotesBasedOnYear(1, 'All');
      return;
    }

    props.setCurrentCall('Search');
    setCurrentDBCall('');
    props.setCurrentPage(1);
    const currentPosts = props.slicePosts(searchedNotes, 1);
    props.setSearchedNote(currentPosts);
    props.setNumberOfPages(Math.ceil(searchedNotes.length / 30));
    return;
  };

  const getNoteYears = async () => {
    const userid = user?.sub?.split('|')[1];
    if (!userid) return;
    const fullListOfNoteYears = await NoteRoutes.getNoteYears(userid);

    // Guard against an empty/failed response before parsing — an empty
    // string is falsy but not strictly `undefined`, and JSON.parse('')
    // throws uncaught, which previously could crash this component.
    if (!fullListOfNoteYears) {
      return;
    }

    let parsed: [OldestNoteYearResult | null] | null;
    try {
      parsed = JSON.parse(fullListOfNoteYears);
    } catch (error) {
      console.log('error parsing note years', error);
      return;
    }

    if (!parsed || parsed[0] === null || parsed[0] === undefined) {
      return;
    }

    const parsedNotes = parsed[0];
    const oldestNoteDate = parsedNotes._id.split('T')[0];
    const oldestNoteJustYear = oldestNoteDate.split('-')[0];
    const currentYear = new Date().getFullYear();

    const years: (string | number)[] = [parseInt(oldestNoteJustYear)];
    let dateincrease = parseInt(oldestNoteJustYear);

    while (dateincrease !== currentYear) {
      dateincrease = dateincrease + 1;
      years.push(dateincrease);
    }
    years.push('Recently Changed', 'All');
    setNoteYears(years);
  };

  const notesYears = (
    callbackProps: NotesYearsCallbackProps,
    year: string | number
  ) => {
    // Was reading `props.currentpage` (lowercase) — NoteYears only ever
    // receives `currentPage` (capital P), so this always evaluated to
    // undefined. Harmless in practice, since setNotesBasedOnYear's first
    // argument is unused by its actual implementation (see notes.tsx) —
    // but genuinely wrong, so fixed now that typing surfaced it.
    callbackProps.setNotesBasedOnYear(callbackProps.currentPage, year);
    setCurrentDBCall(year);
  };

  const runDateSearch = (
    date1: string | undefined,
    date2: string | undefined
  ) => {
    const userId = user?.sub?.split('|')[1];
    if (!userId || !date1 || !date2) {
      return;
    } else {
      setCurrentDBCall('')
      props.getNoteRange(userId, date1, date2);
    }
  };

  return (
    <>
      <Search searchNotes={searchNotes}></Search>
      <DateRange runDateSearch={runDateSearch}
      setCurrentDBCall={setCurrentDBCall}
      ></DateRange>
      <NoteYears
        noteYears={noteYears}
        currentDbCall={currentDbCall}
        notesYears={notesYears}
        currentPage={props.currentPage}
        setNotesBasedOnYear={props.setNotesBasedOnYear}
      ></NoteYears>
    </>
  );
};