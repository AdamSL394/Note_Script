import React, { useState } from 'react';
import Grid from '@mui/material/Grid/index.js';
import TextField from '@mui/material/TextField/index.js';
import FormControl from '@mui/material/FormControl/index.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import Select, { SelectChangeEvent } from '@mui/material/Select/index.js';
import InputLabel from '@mui/material/InputLabel/index.js';
import Button from '@mui/material/Button/index.js';
import NoteRoutes from '../../router/noteRoutes';
import type { TrackedStat, AuthUser } from '../../types';
import './createNote.css';

interface CreateNoteProps {
  disabled: boolean;
  trackedStats: TrackedStat[];
  setTrackedStats: (stats: TrackedStat[]) => void;
  user: AuthUser | undefined;
  text: string | undefined;
  setText: (text: string) => void;
  storeNewNote: (stats: TrackedStat[], date: string | undefined) => void;
}

const EMOJI_LIST: TrackedStat[] = [
  { icon: '🥇', name: 'medal', visible: 'hidden' },
  { icon: '👀', name: 'look', visible: 'hidden' },
  { icon: '💪🏼', name: 'gym', visible: 'hidden' },
  { icon: '🍁', name: 'weed', visible: 'hidden' },
  { icon: '👨🏻‍💻', name: 'code', visible: 'hidden' },
  { icon: '⛹🏻‍♂️', name: 'basketball', visible: 'hidden' },
  { icon: '📚', name: 'read', visible: 'hidden' },
  { icon: '🍕', name: 'eatOut', visible: 'hidden' },
  { icon: '🤴🏻', name: 'king', visible: 'hidden' },
  { icon: '👫', name: 'date/smoosh', visible: 'hidden' },
  { icon: '🌟', name: 'star', visible: 'hidden' },
];

export const CreateNote = (props: CreateNoteProps) => {
  const [date, setDate] = useState<string | undefined>();

  // Toggle a tracked stat's visibility without mutating the existing
  // objects/array — build a new array with a new object for the changed
  // entry, leave everything else untouched.
  const setCodeIcon = (icon: TrackedStat) => {
    const updated = props.trackedStats.map((stat) =>
      stat.name === icon.name
        ? {
            ...stat,
            visible:
              stat.visible === 'visible'
                ? ('hidden' as const)
                : ('visible' as const),
          }
        : stat
    );
    props.setTrackedStats(updated);
  };

  const addToEmojiList = (
    value: string,
    emojiList: TrackedStat[],
    user: AuthUser | undefined
  ) => {
    let emojiName = '';
    let visible: TrackedStat['visible'] = 'hidden';
    for (const item of emojiList) {
      if (item.icon === value) {
        emojiName = item.name;
        visible = item.visible;
      }
    }
    const trackedStat: TrackedStat = {
      icon: value,
      name: emojiName,
      visible,
    };
    for (const stat of props.trackedStats) {
      if (stat.name === trackedStat.name) {
        return;
      }
    }
    props.setTrackedStats([...props.trackedStats, trackedStat]);
    if (user) {
      NoteRoutes.postUserStats(user, trackedStat);
    }
    return;
  };

  // Emoji dropdown — identical for mobile and desktop, only its
  // positioning wrapper differs, so it's a small shared piece too.
  const renderEmojiPicker = (formControlStyle: React.CSSProperties) => (
    <FormControl id="emoji" sx={{ m: 1 }} style={formControlStyle}>
      <InputLabel id="demo-simple-select-label">Icons</InputLabel>
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={''}
        onChange={(e: SelectChangeEvent) => {
          addToEmojiList(e.target.value, EMOJI_LIST, props.user);
        }}
      >
        {EMOJI_LIST.map((i, key) => (
          <MenuItem key={key + 100} value={i.icon}>
            <span key={key}>{i.icon}</span>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <>
      {/* Note text + tracked-stats icon row — identical at every
          breakpoint, so it renders once regardless of viewport rather
          than being duplicated inside the mobile/desktop toggle below. */}
      <Grid item xs={12} sm={12} md={6} lg={6} style={{ margin: '0' }}>
        <TextField
          autoFocus={true}
          multiline
          rows={7}
          label="Note"
          id="fullWidth"
          color="primary"
          placeholder="Note"
          value={props.text}
          onChange={(e) => props.setText(e.target.value)}
          style={{ overflowY: 'auto', overflow: 'visible' }}
        ></TextField>
        <div style={{ width: '20rem', marginLeft: '12px' }}>
          {props.trackedStats?.map((i, key) => {
            return i ? (
              <span key={key + 300}>
                <span
                  key={key}
                  onClick={() => {
                    setCodeIcon(i);
                  }}
                >
                  {i.icon}
                </span>
                <span
                  key={key + 200}
                  role="img"
                  aria-label="checkmark"
                  style={{
                    visibility: i.visible ? i.visible : 'hidden',
                    marginRight: '.5rem',
                  }}
                >
                  ✔️
                </span>
              </span>
            ) : (
              <></>
            );
          })}
        </div>
      </Grid>

      {/* Date input / emoji picker / save button — layout genuinely
          differs between mobile and desktop (see createNote.css), so
          these stay as two variants for now. */}
      <div id="mobileCreateNote">
        <Grid item xs={6} sm={6} md={6} lg={6} style={{ marginTop: '0' }}>
          <span
            style={{
              display: 'flex',
              alignContent: 'space-around',
              flexWrap: 'wrap',
              flexDirection: 'column',
            }}
          >
            <input
              id="date"
              type="date"
              placeholder="Date"
              defaultValue={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                alignSelf: 'center',
                position: 'absolute',
                marginTop: '2.5rem',
              }}
            ></input>

            {renderEmojiPicker({
              position: 'absolute',
              marginTop: '13%',
              width: '7rem',
            })}

            <Button
              id="saveMe"
              disabled={props.disabled}
              style={{
                alignSelf: 'center',
                position: 'absolute',
                marginTop: '13%',
              }}
              variant="contained"
              value="save"
              color="primary"
              onClick={() => props.storeNewNote(props.trackedStats, date)}
            >
              Save Note
            </Button>
          </span>
        </Grid>
      </div>
      <span id="desktopCreateNote">
        <Grid item xs={6} sm={6} md={6} lg={6} style={{ marginTop: '0' }}>
          <span>
            <input
              id="date"
              type="date"
              placeholder="Date"
              defaultValue={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ alignSelf: 'center', position: 'absolute' }}
            ></input>

            <Button
              disabled={props.disabled}
              style={{
                alignSelf: 'center',
                position: 'absolute',
                marginTop: '140px',
                marginLeft: '7px',
              }}
              variant="contained"
              value="save"
              color="primary"
              onClick={() => {
                props.storeNewNote(props.trackedStats, date);
              }}
            >
              Save Note
            </Button>

            {renderEmojiPicker({
              position: 'absolute',
              marginTop: '59px',
              width: '7rem',
            })}
          </span>
        </Grid>
      </span>
    </>
  );
};