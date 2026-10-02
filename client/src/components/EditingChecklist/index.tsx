import { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton/index.js';
import CloseIcon from '@mui/icons-material/Close';
import type { ChecklistItem, Note } from '../../types';
import './editingChecklist.css';

interface EditingChecklistProps {
  note: Note;
  setNoteValue: (note: Note) => void;
}

const MAX_CHECKLIST_ITEMS = 15;

// Checklist editing for an already-saved note that's open in edit
// mode (EditNote/editNote.tsx) -- this was the real gap: edit mode
// let you change the text, date, star and tags, but had no checklist
// UI at all, so a note's checklist items were invisible the moment
// you opened it for editing. Mirrors CreateNote's progressive-
// disclosure pattern (only the actively-edited item is a bordered
// input; the rest are compact checkbox+text rows), and follows the
// same staged-draft convention as EditingTrackedEmojis/setDateNote:
// reads any existing sessionStorage draft first, writes the merged
// result back, and hands it to setNoteValue for the live re-render --
// saveNote (useNoteEditing/notes.tsx) reads sessionStorage as its
// source of truth when the note is actually saved.
export const EditingChecklist = (props: EditingChecklistProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const justHandledEnterRef = useRef(false);

  useEffect(() => {
    if (activeIndex !== null) {
      inputRef.current?.focus();
    }
  }, [activeIndex]);

  const getDraftChecklist = (): ChecklistItem[] => {
    const rawStored = sessionStorage.getItem(props.note._id);
    const storedNote: Note | null = rawStored ? JSON.parse(rawStored) : null;
    const baseNote = storedNote ?? props.note;
    return baseNote.checklist ?? [];
  };

  const commitChecklist = (nextChecklist: ChecklistItem[]) => {
    const rawStored = sessionStorage.getItem(props.note._id);
    const storedNote: Note | null = rawStored ? JSON.parse(rawStored) : null;
    const baseNote = storedNote ?? props.note;
    const updatedNote: Note = { ...baseNote, checklist: nextChecklist };
    sessionStorage.setItem(updatedNote._id, JSON.stringify(updatedNote));
    props.setNoteValue(updatedNote);
  };

  const checklist = getDraftChecklist();

  const addItem = () => {
    if (checklist.length >= MAX_CHECKLIST_ITEMS) return;
    const next = [...checklist, { text: '', checked: false }];
    commitChecklist(next);
    setActiveIndex(next.length - 1);
  };

  const updateItemText = (index: number, text: string) => {
    commitChecklist(checklist.map((item, i) => (i === index ? { ...item, text } : item)));
  };

  const toggleItemChecked = (index: number) => {
    commitChecklist(
      checklist.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeItem = (index: number) => {
    commitChecklist(checklist.filter((_, i) => i !== index));
    if (activeIndex === index) {
      setActiveIndex(null);
    }
  };

  const resolveActiveItem = () => {
    if (activeIndex === null) return;
    const item = checklist[activeIndex];
    if (!item || item.text.trim().length === 0) {
      removeItem(activeIndex);
      return;
    }
    setActiveIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    justHandledEnterRef.current = true;
    const item = checklist[index];
    if (item && item.text.trim().length === 0) {
      removeItem(index);
      return;
    }
    if (checklist.length < MAX_CHECKLIST_ITEMS) {
      addItem();
    } else {
      setActiveIndex(null);
    }
  };

  const handleBlur = () => {
    if (justHandledEnterRef.current) {
      justHandledEnterRef.current = false;
      return;
    }
    resolveActiveItem();
  };

  if (checklist.length === 0 && activeIndex === null) {
    return (
      <div className="editingChecklistSection">
        <button type="button" className="editingAddChecklistButton" onClick={addItem}>
          + Checklist item
        </button>
      </div>
    );
  }

  return (
    <div className="editingChecklistSection">
      <div className="editingChecklistScrollArea">
        {checklist.map((item, index) => {
          if (activeIndex === index) {
            return (
              <div className="editingChecklistItemActive" key={index}>
                <input
                  ref={inputRef}
                  type="text"
                  value={item.text}
                  placeholder="Checklist item"
                  maxLength={200}
                  enterKeyHint="done"
                  onChange={(e) => updateItemText(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onBlur={handleBlur}
                />
              </div>
            );
          }
          return (
            <div className="editingChecklistItemFilled" key={index}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItemChecked(index)}
                aria-label={`Mark "${item.text}" as done`}
              />
              <span
                className={item.checked ? 'editingChecklistTextDone' : 'editingChecklistText'}
                onClick={() => setActiveIndex(index)}
              >
                {item.text}
              </span>
              <IconButton
                size="small"
                aria-label="Remove checklist item"
                onClick={() => removeItem(index)}
                className="editingChecklistRemoveButton"
              >
                <CloseIcon style={{ fontSize: '14px' }} />
              </IconButton>
            </div>
          );
        })}
      </div>
      {checklist.length < MAX_CHECKLIST_ITEMS && (
        <button type="button" className="editingAddChecklistButton" onClick={addItem}>
          + Checklist item
        </button>
      )}
    </div>
  );
};
