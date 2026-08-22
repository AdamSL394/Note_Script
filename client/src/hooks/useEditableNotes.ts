import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import NoteRoutes from '../router/noteRoutes';
import type { Note as NoteType } from '../types';

// Everything notes.tsx already implemented for editing/saving/deleting
// a note in place, lifted out so HomeView's weekly digest can offer the
// exact same behavior instead of staying read-only. Both callers own
// their own `notes` state (they fetch different things — one page of
// "All Notes", one LookBack range) and hand it to this hook rather than
// the hook owning fetching itself.
export const useEditableNotes = (
  setNotes: Dispatch<SetStateAction<NoteType[]>>,
  // Called after a delete actually completes on the server, with the
  // deleted note's id, so each caller can respond however fits its own
  // data flow: notes.tsx repaginates "All Notes" (ignoring the id),
  // HomeView just filters the id out of its already-loaded range
  // locally rather than needing to know which LookBack range is
  // currently active in order to refetch it.
  onAfterDelete: (deletedNoteId: string) => void
) => {
  const [open, setOpen] = useState(false);
  const [modelNoteId, setModelNoteId] = useState<string | undefined>();

  // Stages a note for editing: computes the remaining-character budget,
  // marks it editable, and persists the draft so EditingNote/Textarea
  // can pick it back up.
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

  // Applies the server's response (the source of truth after an update)
  // to the matching note in state, instead of discarding it. Don't force
  // `edit` to false here — this is also used to *open* a note for
  // editing (edit: true), not just to save one.
  const updateNote = async (note: NoteType) => {
    const updatedNoteFromServer = await NoteRoutes.updateNote(note);
    if (!updatedNoteFromServer || !updatedNoteFromServer._id) {
      return;
    }
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n._id === updatedNoteFromServer._id ? updatedNoteFromServer : n
      )
    );
  };

  // Accepts an optional updated note for a proper immutable replace.
  // Falls back to "just re-render" when called with no argument, since
  // Textarea still relies on mutating props.note directly and just
  // needs a nudge to re-render (a separate, larger fix for its own
  // session — see notes on Textarea).
  const setNoteValue = (updatedNote?: NoteType) => {
    if (updatedNote && updatedNote._id) {
      setNotes((prevNotes) =>
        prevNotes.map((n) => (n._id === updatedNote._id ? updatedNote : n))
      );
      return;
    }
    setNotes((prevNotes) => [...prevNotes]);
  };

  // Merges in any staged draft, then updates the date without mutating
  // the note object or relying on shared-reference mutation to sync UI.
  const setDateNote = (
    e: React.ChangeEvent<HTMLInputElement>,
    note: NoteType
  ) => {
    const rawStored = sessionStorage.getItem(note._id);
    const storedNote: NoteType | null = rawStored
      ? JSON.parse(rawStored)
      : null;
    const updatedNote: NoteType = storedNote
      ? { ...storedNote, date: e.target.value }
      : { ...note, date: e.target.value };
    sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n._id === note._id ? updatedNote : n))
    );
  };

  // Stages a star-rating change in sessionStorage without hitting the
  // server — saveNote reads this draft back out and persists it for
  // real once the whole note is saved. Spreads the full draft/note
  // (not a narrow field pick) so an in-progress tag edit isn't lost
  // when the star rating changes before saving.
  const onStarValueChange = (e: SelectChangeEvent, note: NoteType) => {
    const rawDraft = sessionStorage.getItem(note._id);
    const draftNote: NoteType | null = rawDraft ? JSON.parse(rawDraft) : null;
    const source = draftNote ?? note;
    const newNote: NoteType = {
      ...source,
      star: e.target.value,
    };
    sessionStorage.setItem(note._id, JSON.stringify(newNote));
  };

  const openModal = (note: NoteType) => {
    setModelNoteId(note._id);
    setOpen(true);
  };

  const closeModal = async (noteId: string | 'Cancel') => {
    if (noteId === 'Cancel') {
      setOpen(false);
      return;
    }
    setOpen(false);
    await NoteRoutes.deleteNote(noteId);
    onAfterDelete(noteId);
  };

  return {
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
  };
};
