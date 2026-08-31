import Search from '../Search/search';
import { useAuth0 } from '@auth0/auth0-react';
import { DateRange } from '../DateRange/index';
import type { Note } from '../../types';
import './searchNotes.css';

interface SearchNotesProps {
  getNoteRange: (userId: string, start: string, end: string) => Promise<void>;
  setSearchedNote: (notes: Note[]) => void;
  setNotesBasedOnYear: (unused: unknown, year: string | number) => void;
  // Owned by useNoteYears (in notes.tsx) — Search and DateRange both
  // need to clear the year sidebar's "currently selected" highlight
  // when they run their own query.
  setCurrentDbCall: (value: string | number) => void;
}

export const SearchNotes = (props: SearchNotesProps) => {
  const { user } = useAuth0();

  const searchNotes = async (searchedNotes: Note[], searchTerm: string) => {
    if (searchTerm.length === 0) {
      props.setCurrentDbCall('All');
      props.setNotesBasedOnYear(1, 'All');
      return;
    }
    props.setCurrentDbCall('');
    props.setSearchedNote(searchedNotes);
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
      props.setCurrentDbCall('');
      props.getNoteRange(userId, date1, date2);
    }
  };

  return (
    <div className="searchAndDateRow">
      <Search searchNotes={searchNotes}></Search>
      <DateRange
        runDateSearch={runDateSearch}
        setCurrentDBCall={props.setCurrentDbCall}
      ></DateRange>
    </div>
  );
};
