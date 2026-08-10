import React, { useState } from 'react';
import type { Note } from '../../types';

interface TextareaProps {
  note: Note;
  // Passed in from editingNote.tsx but never actually used inside this
  // component — kept in the type to match reality rather than hiding it.
  notes?: Note[];
  setNoteValue: (note: Note) => void;
}

// onChangeTextArea is bound to three structurally different React event
// types (onChange, onPaste, onClick). Only ChangeEvent<T> types `.target`
// as T — ClipboardEvent<T> and MouseEvent<T> type it as a generic
// EventTarget with no `.value`. `.currentTarget` is correctly typed as T
// across all three, so that's used throughout instead.
type TextareaEvent =
  | React.ChangeEvent<HTMLTextAreaElement>
  | React.ClipboardEvent<HTMLTextAreaElement>
  | React.MouseEvent<HTMLTextAreaElement>;

const Textarea = (props: TextareaProps) => {
  const characterCount = 200;
  const [postContent, setPostContent] = useState(props.note.text);

  // "Characters remaining" only ever depends on the resulting text's
  // length — it doesn't matter whether that text came from typing,
  // pasting, cutting, or undo/redo. Builds a new note object and hands
  // it to props.setNoteValue instead of mutating props.note directly.
  const onChangeTextArea = (e: TextareaEvent, note: Note): string => {
    // Clamp to the character cap (e.g. pasting in more than 200 chars).
    // Done here — the single place all three event handlers below route
    // through — rather than separately in the onChange handler, so the
    // displayed text and the saved note text can never fall out of sync.
    if (e.currentTarget.value.length > characterCount) {
      e.currentTarget.value = e.currentTarget.value.slice(0, characterCount);
    }

    const newText = e.currentTarget.value;
    const newTextLength = characterCount - newText.length;

    const updatedNote: Note = {
      ...note,
      text: newText,
      textLength: newTextLength,
    };
    sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
    props.setNoteValue(updatedNote);

    return newText;
  };

  return (
    <>
      <textarea
        style={{
          width: '94%',
          fontSize: 'medium',
          borderRadius: '5px 5px 5px 5px',
          height: '13rem',
        }}
        id="editCard"
        value={postContent}
        onChange={(e) => {
          const clampedText = onChangeTextArea(e, props.note);
          setPostContent(clampedText);
        }}
        onPaste={(e) => onChangeTextArea(e, props.note)}
        onClick={(e) => onChangeTextArea(e, props.note)}
      />
    </>
  );
};

export default Textarea;