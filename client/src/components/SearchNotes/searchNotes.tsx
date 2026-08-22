import React from 'react';
import Search from '../Search/search';
import { useAuth0 } from '@auth0/auth0-react';
import { DateRange } from '../DateRange/index';
import type { Note } from '../../types';
import './searchNotes.css';

interface SearchNotesProps {
  setCurrentPage: (page: number) => void;
  getNoteRange: (userId: string, start: string, end: string) => Promise<void>;
  setCurrentCall: (call: string | number) => void;
  slicePosts: (notes: Note[], page: number) => Note[];
  setSearchNoteResults: (notes: Note[]) => void;
  setNumberOfPages: (pages: number) => void;
  setSearchedNote: (notes: Note[]) => void;
  setNotesBasedOnYear: (unused: unknown, year: string | number) => void;
  // Owned by useNoteYears (see notes.tsx) now that the years list
  // renders as an independent sidebar rather than nested inside this
  // component — still needed here because searching or date-ranging
  // should clear the "a year is selected" highlight in that sidebar.
  setCurrentDBCall: (value: string | number) => void;
}

// Just the top filter row now (search box + date range) — the years
// list used to render here too, but moved out to its own sidebar (see
// notes.tsx) so it can run down the side of the page instead of being
// confined under the search box.
export const SearchNotes = (props: SearchNotesProps) => {
  const { user } = useAuth0();

  const searchNotes = async (searchedNotes: Note[], searchTerm: string) => {
    props.setSearchNoteResults(searchedNotes);
    if (searchTerm.length === 0) {
      props.setSearchNoteResults([]);
      props.setCurrentDBCall('All');
      props.setNotesBasedOnYear(1, 'All');
      return;
    }

    props.setCurrentCall('Search');
    props.setCurrentDBCall('');
    props.setCurrentPage(1);
    const currentPosts = props.slicePosts(searchedNotes, 1);
    props.setSearchedNote(currentPosts);
    props.setNumberOfPages(Math.ceil(searchedNotes.length / 30));
    return;
  };

  const runDateSearch = (
    date1: string | undefined,
    date2: string | undefined
  ) => {
    const userId = user?.sub?.split('|')[1];
    if (!userId || !date1 || !date2) {
      return;
    } else {
      props.setCurrentDBCall('');
      props.getNoteRange(userId, date1, date2);
    }
  };

  return (
    <div className="searchControls">
      <Search searchNotes={searchNotes}></Search>
      <DateRange runDateSearch={runDateSearch}></DateRange>
    </div>
  );
};
