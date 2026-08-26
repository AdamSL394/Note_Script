import React from 'react';
import Card from '@mui/material/Card/index.js';
import Button from '@mui/material/Button/index.js';
import FormControl from '@mui/material/FormControl/index.js';
import InputLabel from '@mui/material/InputLabel/index.js';
import Select, { SelectChangeEvent } from '@mui/material/Select/index.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import Textarea from '../TextArea/index';
import { TrackedEmojis } from '../TrackedEmojis/index';
import { EditingTrackedEmojis } from '../EditingTrackedEmojis/index';
import type { Note } from '../../types';
import './editingNote.css';

interface EditingNoteProps {
  note: Note;
  notes: Note[];
  setDateNote: (e: React.ChangeEvent<HTMLInputElement>, note: Note) => void;
  currentPage: number;
  setNoteValue: (note?: Note) => void;
  saveNote: (note: Note) => void;
  openModal: (note: Note) => void;
  updateNote: (note: Note) => void;
  // Bound to a MUI <Select>'s onChange, not a plain input — SelectChangeEvent
  // is the correct type here, not React.ChangeEvent<HTMLInputElement>.
  onStarValueChange: (e: SelectChangeEvent, note: Note) => void;
}

function EditingNote(props: EditingNoteProps) {
  const characterCount = 200;
  const remaining = props.note.textLength ?? characterCount - props.note.text.length;

  // Guards against both a missing value and legacy notes saved with the
  // old star:'false' schema-default bug (see server/models/notes.ts) —
  // either way, falls back to 'None' rather than a value the Select has
  // no matching MenuItem for (which renders as a blank box).
  const validStarValues = new Set(['None', '1', '2', '3']);
  const starValue = validStarValues.has(props.note.star)
    ? props.note.star
    : 'None';

  return (
    <div className="noteCard">
      <Card variant="outlined" id="Card" className="editingCard">
        <div className="editingCardHeader">
          <div className="editingDateRow">
            <input
              onChange={(e) => {
                props.setDateNote(e, props.note);
              }}
              type="date"
              defaultValue={props.note.date}
              className="editingDateInput"
            ></input>

            <FormControl size="small">
              {/* Was rendered with no text at all, which is why this
                  looked like an empty box in the UI — a Select still
                  needs a visible label to not look broken. */}
              <InputLabel id="star-select-label">Stars</InputLabel>
              <Select
                labelId="star-select-label"
                label="Stars"
                onChange={(e) => props.onStarValueChange(e, props.note)}
                // Was hardcoded to '' regardless of the note's actual
                // saved rating, so opening any note for editing always
                // showed a blank selector no matter what star value it
                // already had. Now reflects the real current value.
                defaultValue={starValue}
                className="editingStarSelect"
              >
                <MenuItem value={'None'}>
                  <em>None</em>
                </MenuItem>
                <MenuItem value={'1'}>
                  <span role="img" aria-label="Star">
                    🌟
                  </span>
                </MenuItem>
                <MenuItem value={'2'}>
                  <span role="img" aria-label="Star">
                    🌟🌟
                  </span>
                </MenuItem>
                <MenuItem value={'3'}>
                  <span role="img" aria-label="Star">
                    🌟🌟🌟
                  </span>
                </MenuItem>
              </Select>
            </FormControl>
          </div>

          <Button
            onClick={() => props.openModal(props.note)}
            color="primary"
            id="deleteButton"
          >
            <strong>X</strong>
          </Button>
        </div>

        <EditingTrackedEmojis
          note={props.note}
          setNoteValue={props.setNoteValue}
        ></EditingTrackedEmojis>

        <Textarea
          notes={props.notes}
          note={props.note}
          setNoteValue={props.setNoteValue}
        ></Textarea>

        <div className="editingFooterRow">
          <Button
            onClick={() => props.saveNote(props.note)}
            variant="contained"
            sx={{
              backgroundColor: 'var(--ns-blue)',
              '&:hover': { backgroundColor: 'var(--ns-blue)', opacity: 0.9 },
            }}
          >
            save
          </Button>
          <span className="editingCharCount">{remaining} characters left</span>
        </div>

        <div>
          <div className="editingActiveTagsLabel">Active tags</div>
          <TrackedEmojis note={props.note}></TrackedEmojis>
        </div>
      </Card>
    </div>
  );
}

export default EditingNote;
