import React from 'react';
import Card from '@mui/material/Card/index.js';
import Button from '@mui/material/Button/index.js';
import IconButton from '@mui/material/IconButton/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import FormControl from '@mui/material/FormControl/index.js';
import InputLabel from '@mui/material/InputLabel/index.js';
import Select, { SelectChangeEvent } from '@mui/material/Select/index.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import Textarea from '../TextArea/index';
import { EditingTrackedEmojis } from '../EditingTrackedEmojis/index';
import type { Note, TrackedStat } from '../../types';
import { sanitizeStarValue } from '../../utils/sanitizeStarValue';
import './editNote.css';

interface EditingNoteProps {
  note: Note;
  notes: Note[];
  trackedStats: TrackedStat[];
  setDateNote: (e: React.ChangeEvent<HTMLInputElement>, note: Note) => void;
  currentPage: number;
  setNoteValue: (note?: Note) => void;
  saveNote: (note: Note) => void;
  openModal: (note: Note) => void;
  updateNote: (note: Note) => void;
  cancelEdit: (note: Note) => void;
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
  // no matching MenuItem for (which renders as a blank box). The
  // underlying note data itself is now also sanitized where edit mode
  // is entered (Note/index.tsx, homeView.tsx) -- this display guard
  // remains as a second layer in case a note ever reaches this
  // component without going through that path.
  const starValue = sanitizeStarValue(props.note.star);

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
              <InputLabel id="star-select-label">Rating</InputLabel>
              <Select
                labelId="star-select-label"
                label="Rating"
                onChange={(e) => props.onStarValueChange(e, props.note)}
                // Was hardcoded to '' regardless of the note's actual
                // saved rating, so opening any note for editing always
                // showed a blank selector no matter what star value it
                // already had. Now reflects the real current value.
                defaultValue={starValue}
                className="editingStarSelect"
                renderValue={(value) => {
                  const count = value === 'None' ? 0 : Number(value);
                  if (count === 0) return 'None';
                  return '★'.repeat(count) + '☆'.repeat(3 - count);
                }}
              >
                <MenuItem value={'None'}>
                  <em>None</em>
                </MenuItem>
                <MenuItem value={'1'}>★☆☆</MenuItem>
                <MenuItem value={'2'}>★★☆</MenuItem>
                <MenuItem value={'3'}>★★★</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="editingHeaderActions">
            <Tooltip title="Close without saving">
              <IconButton
                onClick={() => props.cancelEdit(props.note)}
                aria-label="Close without saving"
                size="small"
              >
                <CloseIcon style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete entry">
              <IconButton
                onClick={() => props.openModal(props.note)}
                aria-label="Delete note"
                size="small"
                id="deleteButton"
              >
                <DeleteOutlineIcon style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <EditingTrackedEmojis
          note={props.note}
          trackedStats={props.trackedStats}
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
            Save
          </Button>
          <span className="editingCharCount">{remaining} characters left</span>
        </div>
      </Card>
    </div>
  );
}

export default EditingNote;
