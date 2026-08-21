import React from 'react';
import Grid from '@mui/material/Grid/index.js';
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
  return (
    <Grid xs={8} sm={5} md={5} lg={2} style={{ margin: '.5%' }} item>
      <Card variant="outlined" id="Card">
        <Button
          onClick={() => props.openModal(props.note)}
          color="primary"
          id="deleteButton"
        >
          <strong>X</strong>
        </Button>

        <div
          style={{
            marginLeft: '5%',
          }}
          id="dateInput"
        >
          <input
            onChange={(e) => {
              props.setDateNote(e, props.note);
            }}
            type="date"
            defaultValue={props.note.date}
            style={{
              marginTop: '4%',
              borderRadius: '5px 5px 5px 5px',
              border: '1px solid var(--ns-rule)',
            }}
          ></input>

          <FormControl
            sx={{ m: 1, minWidth: 90 }}
            size="medium"
            style={{ alignSelf: 'center' }}
          >
            <InputLabel
              id="demo-select-small"
              style={{ alignSelf: 'center' }}
            ></InputLabel>
            <Select
              labelId="demo-select-small"
              id="demo-select-small"
              onChange={(e) => props.onStarValueChange(e, props.note)}
              defaultValue={''}
              style={{ height: ' 1.3rem',marginTop:'.5rem' }}
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
                  🌟🌟🌟{' '}
                </span>
              </MenuItem>
            </Select>
          </FormControl>
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
        <div>
          <Button onClick={() => props.saveNote(props.note)}>
            <strong>Save Me</strong>
          </Button>
        </div>
        <>{props.note.textLength}</>
        <TrackedEmojis note={props.note}></TrackedEmojis>
      </Card>
    </Grid>
  );
}

export default EditingNote;