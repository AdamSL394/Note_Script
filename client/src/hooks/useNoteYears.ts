import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../router/noteRoutes';
import type { NotesYearsCallbackProps } from '../components/NoteYears/noteYears';

interface OldestNoteYearResult {
  _id: string;
}

// Was previously local state inside SearchNotes, which only made sense
// while NoteYears rendered nested under the search box. Now that years
// render as an independent sidebar (see notes.tsx), both places need
// the same "which years exist / which one's currently selected" state,
// so it lives here instead of being owned by (and prop-drilled out of)
// a component that no longer renders the years list itself.
export const useNoteYears = (
  currentPage: number,
  setNotesBasedOnYear: (unused: unknown, year: string | number) => void
) => {
  const [noteYears, setNoteYears] = useState<(string | number)[]>([]);
  const [currentDbCall, setCurrentDBCall] = useState<string | number>('All');
  const { user } = useAuth0();

  useEffect(() => {
    // Auth0's `user` is undefined until authentication resolves. Without
    // this guard, getNoteYears() can run before `user` exists and throw
    // on `user.sub` inside NoteRoutes.
    if (!user) {
      return;
    }
    getNoteYears();
  }, [user]);

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
    callbackProps.setNotesBasedOnYear(callbackProps.currentPage, year);
    setCurrentDBCall(year);
  };

  return { noteYears, currentDbCall, setCurrentDBCall, notesYears };
};
