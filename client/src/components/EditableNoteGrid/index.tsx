import React from 'react';
import EditingNote from '../EditNote/editingNote';
import ModalPop from '../Modal/index';
import { NoteCard } from '../NoteCard/index';
import type { Note as NoteType } from '../../types';
import type { SelectChangeEvent } from '@mui/material/Select/index.js';

interface EditableNoteGridProps {
  notes: NoteType[];
  currentPage: number;
  open: boolean;
  modelNoteId: string | undefined;
  editNote: (note: NoteType) => void;
  saveNote: (note: NoteType) => void;
  updateNote: (note: NoteType) => void;
  setNoteValue: (note?: NoteType) => void;
  setDateNote: (e: React.ChangeEvent<HTMLInputElement>, note: NoteType) => void;
  onStarValueChange: (e: SelectChangeEvent, note: NoteType) => void;
  openModal: (note: NoteType) => void;
  closeModal: (noteId: string | 'Cancel') => void;
}

// The note.edit ? <EditingNote> : <NoteCard> switch, plus its delete
// confirmation modal — previously only lived inside notes.tsx, which is
// why HomeView's weekly digest could only ever render read-only cards.
// Pulling it out means both places get identical edit/save/delete
// behavior instead of HomeView needing its own smaller reimplementation.
export const EditableNoteGrid = (props: EditableNoteGridProps) => {
  return (
    <>
      <ModalPop
        open={props.open}
        modelNoteId={props.modelNoteId}
        closeModal={props.closeModal}
      ></ModalPop>
      {props.notes.map((note) => {
        if (!note.edit) {
          return (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={props.editNote}
              onDelete={props.openModal}
            />
          );
        }
        // Compute textLength without mutating the state object during
        // render — pass it through as part of a new object instead.
        const textLength =
          note.textLength !== undefined
            ? note.textLength
            : 200 - note.text.length;
        return (
          <EditingNote
            key={note._id}
            notes={props.notes}
            note={{ ...note, textLength }}
            setDateNote={props.setDateNote}
            currentPage={props.currentPage}
            setNoteValue={props.setNoteValue}
            saveNote={props.saveNote}
            openModal={props.openModal}
            updateNote={props.updateNote}
            onStarValueChange={props.onStarValueChange}
          ></EditingNote>
        );
      })}
    </>
  );
};
