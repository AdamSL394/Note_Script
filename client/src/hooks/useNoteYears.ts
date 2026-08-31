import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../router/noteRoutes';

interface OldestNoteYearResult {
  _id: string;
}

// Fetches the list of years the user has notes in (plus the two special
// entries 'Recently Changed' and 'All'), and tracks which one is
// currently selected. `onSelectYear` is the caller's hook into actually
// loading notes for a given year — this hook only owns the year list
// and selection state, not the note-fetching itself.
export const useNoteYears = (onSelectYear: (year: string | number) => void) => {
  const [noteYears, setNoteYears] = useState<(string | number)[]>([]);
  const [currentDbCall, setCurrentDbCall] = useState<string | number>('All');
  const { user } = useAuth0();

  useEffect(() => {
    // Auth0's `user` is undefined until authentication resolves. Without
    // this guard, fetchNoteYears() can run before `user` exists and
    // throw on `user.sub`.
    if (!user) {
      return;
    }
    fetchNoteYears();
  }, [user]);

  const fetchNoteYears = async () => {
    const userid = user?.sub?.split('|')[1];
    if (!userid) return;
    const fullListOfNoteYears = await NoteRoutes.getNoteYears();

    // Guard against an empty/failed response before parsing — an empty
    // string is falsy but not strictly `undefined`, and JSON.parse('')
    // throws uncaught.
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

  const selectYear = (year: string | number) => {
    if (year === currentDbCall) return;
    setCurrentDbCall(year);
    onSelectYear(year);
  };

  return { noteYears, currentDbCall, setCurrentDbCall, selectYear };
};
