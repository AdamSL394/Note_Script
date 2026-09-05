import { useState } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';
import NoteRoutes from '../router/noteRoutes';
import type { Note as NoteType } from '../types';
import { sanitizeStarValue } from '../utils/sanitizeStarValue';

type SetNotes = (updater: NoteType[] | ((prev: NoteType[]) => NoteType[])) => void;

export function useNoteEditing(setNotes: SetNotes, onDeleted?: () => void) {
    const [open, setOpen] = useState(false);
    const [modelNoteId, setModelNoteId] = useState<string | undefined>();
    const [saveError, setSaveError] = useState<string | undefined>();

    // Applies the server's response (the source of truth after an
    // update) to the matching note in state. Called both to *save* a
    // note (saveNote sends edit: false) and to *open* one for editing
    // (editNote sends edit: true) -- trusts whatever `edit` value the
    // server echoes back rather than hardcoding it, since forcing it to
    // false here would silently kick a note back out of edit mode the
    // instant you opened it.
    //
    // Returns whether the update actually succeeded, and sets
    // saveError on failure -- previously this silently returned on
    // failure with zero signal to the caller or the user, which is
    // exactly what made the star-collision bug confusing: a rejected
    // save just did nothing, with no indication anything had gone
    // wrong.
    const updateNote = async (note: NoteType): Promise<boolean> => {
        const updatedNoteFromServer = await NoteRoutes.updateNote(note);
        if (!updatedNoteFromServer || !updatedNoteFromServer._id) {
            setSaveError('Something went wrong saving your changes. Please try again.');
            return false;
        }
        setSaveError(undefined);
        setNotes((prevNotes) =>
            prevNotes.map((n) =>
                n._id === updatedNoteFromServer._id ? updatedNoteFromServer : n
            )
        );
        return true;
    };

    // Saves whatever draft exists in sessionStorage for this note (or
    // the note itself if no draft was staged), without mutating either.
    const saveNote = (note: NoteType) => {
        const rawDraft = sessionStorage.getItem(note._id);
        const draftNote: NoteType | null = rawDraft ? JSON.parse(rawDraft) : null;
        const noteToSave: NoteType = draftNote
            ? { ...draftNote, edit: false }
            : { ...note, edit: false };
        sessionStorage.setItem(noteToSave._id, JSON.stringify(noteToSave));
        updateNote(noteToSave);
    };

    // Accepts an optional updated note for a proper immutable replace.
    // Falls back to "just re-render" when called with no argument,
    // since the underlying textarea still relies on mutating props.note
    // directly and just needs a nudge to re-render.
    const setNoteValue = (updatedNote?: NoteType) => {
        if (updatedNote && updatedNote._id) {
            setNotes((prevNotes) =>
                prevNotes.map((n) => (n._id === updatedNote._id ? updatedNote : n))
            );
            return;
        }
        setNotes((prevNotes) => [...prevNotes]);
    };

    // Merges in any staged draft, then updates the date without
    // mutating the note object or relying on shared-reference mutation
    // to sync UI.
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

    const openModal = (note: NoteType) => {
        setModelNoteId(note._id);
        setOpen(true);
    };

    // Closes edit mode WITHOUT saving whatever was typed -- discards
    // the staged draft and restores the pristine pre-edit snapshot
    // (stashed by the caller's editNote function before entering edit
    // mode), rather than committing partial changes or leaving the
    // note stuck in edit mode with no way out.
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

    // Updates just the star rating within whatever draft is currently
    // staged in sessionStorage for this note, without touching the
    // rest of the draft's fields.
    const onStarValueChange = (
        e: SelectChangeEvent,
        note: NoteType
    ) => {
        const rawDraft = sessionStorage.getItem(note._id);
        const updatedNote: NoteType | null = rawDraft ? JSON.parse(rawDraft) : null;
        const baseNote = updatedNote ?? note;
        const newNote: NoteType = { ...baseNote, star: e.target.value };
        sessionStorage.setItem(note._id, JSON.stringify(newNote));
    };

    const closeModal = async (noteId: string | 'Cancel') => {
        if (noteId !== 'Cancel') {
            setOpen(false);
            await NoteRoutes.deleteNote(noteId);
            onDeleted?.();
        }
        if (noteId === 'Cancel') {
            setOpen(false);
        }
    };

    return {
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
    };
}
