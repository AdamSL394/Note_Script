import { useEffect, useRef, useState } from 'react';
import { toLocalDateString } from '../../utils/date';
import { getTagColor } from '../../utils/tagColor';
import TextField from '@mui/material/TextField/index.js';
import FormControl from '@mui/material/FormControl/index.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import Select, { SelectChangeEvent } from '@mui/material/Select/index.js';
import InputLabel from '@mui/material/InputLabel/index.js';
import Button from '@mui/material/Button/index.js';
import NoteRoutes from '../../router/noteRoutes';
import type { TrackedStat, AuthUser } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS } from '../../constants/noteFields';
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

// Built from the shared tag list instead of a separately hand-typed
// copy — previously this list and NotesHomeView's tag table had drifted
// out of order/sync with each other. 'star' is appended on top since
// it's specific to this picker (a trackable "did I do something
// 5-star-worthy" stat) rather than a Note tag field.
//
// Deliberately kept excluded from WIN_TAGS: 'star' collides with the
// Note schema's existing String star-rating field (see
// noteController/models/notes.ts), so toggling this tracked stat likely
// already clobbers that field. Not fixed here since it's a
// backend/schema concern, not a styling one — flagging so it doesn't
// get lost.
const EMOJI_LIST: TrackedStat[] = NOTE_TAG_FIELDS.map(({ field, icon }) => ({
  icon,
  name: field,
  visible: 'hidden' as const,
}));

export const CreateNote = (props: CreateNoteProps) => {
  const [date, setDate] = useState<string>(
    toLocalDateString(new Date())
  );
  const CHARACTER_LIMIT = 200;
  const tagRowRef = useRef<HTMLDivElement>(null);
  const [hasMoreTags, setHasMoreTags] = useState(false);

  // Only shows the fade when there is genuinely more content scrolled
  // out of view -- a fade that never disappears (even once you have
  // actually scrolled to the end, or when there are few enough tags
  // that nothing overflows at all) would misrepresent the actual
  // state rather than signal it.
  useEffect(() => {
    const el = tagRowRef.current;
    if (!el) return;
    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setHasMoreTags(hasOverflow && !atEnd);
    };
    checkOverflow();
    el.addEventListener('scroll', checkOverflow);
    window.addEventListener('resize', checkOverflow);
    return () => {
      el.removeEventListener('scroll', checkOverflow);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [props.trackedStats]);

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

  return (
    <div className="createNoteCard">
      <div className="createNoteMain">
        <p className="composeHeading">What&apos;s on your mind?</p>
        <TextField
          autoFocus={true}
          multiline
          rows={7}
          fullWidth
          label="Note"
          placeholder={'Gym in the morning\nCoffee with friends\nFinished the report'}
          value={props.text ?? ''}
          onChange={(e) => {
            const clamped = e.target.value.slice(0, CHARACTER_LIMIT);
            props.setText(clamped);
          }}
          helperText={`${(props.text ?? '').length}/${CHARACTER_LIMIT}`}
          InputProps={{ style: { fontFamily: 'var(--font-serif)', fontSize: '15px' } }}
        />
        <div className="tagRowWrap">
          <div className="tagRow" ref={tagRowRef}>
          {props.trackedStats?.map((stat, key) => {
            if (!stat) return null;
            const active = stat.visible === 'visible';
            const isWin = WIN_TAGS.includes(stat.name);
            const className = [
              'tagChip',
              active ? 'active' : '',
              active && isWin ? 'win' : '',
            ]
              .filter(Boolean)
              .join(' ');
            // Win tags keep their amber treatment from the CSS class
            // above (a meaningful signal, not decoration) -- only
            // non-win active tags get the per-tag hash color, so it
            // never overrides that existing meaning.
            const tagColor = active && !isWin ? getTagColor(stat.name) : null;
            return (
              <button
                key={key}
                type="button"
                className={className}
                style={
                  tagColor
                    ? {
                        borderColor: 'transparent',
                        background: tagColor.background,
                        color: tagColor.text,
                      }
                    : undefined
                }
                onClick={() => setCodeIcon(stat)}
              >
                <span aria-hidden="true">{stat.icon}</span>
                <span>{stat.name}</span>
              </button>
            );
          })}
          </div>
          {hasMoreTags && <div className="tagFade" aria-hidden="true"></div>}
        </div>
      </div>

      <div className="createNoteControls">
        <TextField
          type="date"
          label="Date"
          size="small"
          fullWidth
          value={date ?? ''}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel id="demo-simple-select-label">Add a tag</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            label="Add a tag"
            value={''}
            onChange={(e: SelectChangeEvent) => {
              addToEmojiList(e.target.value, EMOJI_LIST, props.user);
            }}
          >
            {EMOJI_LIST.map((i, key) => (
              <MenuItem key={key + 100} value={i.icon}>
                <span key={key}>
                  {i.icon} {i.name}
                </span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          className="saveEntryButton"
          disabled={props.disabled}
          fullWidth
          variant="contained"
          value="save"
          onClick={() => props.storeNewNote(props.trackedStats, date)}
          sx={{
            backgroundColor: 'var(--ns-blue)',
            '&:hover': { backgroundColor: 'var(--ns-blue)', opacity: 0.9 },
          }}
        >
          Add note
        </Button>
      </div>
    </div>
  );
};