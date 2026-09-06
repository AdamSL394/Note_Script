import { useEffect, useRef, useState } from 'react';
import { toLocalDateString } from '../../utils/date';
import { getTagColor } from '../../utils/tagColor';
import TextField from '@mui/material/TextField/index.js';
import Button from '@mui/material/Button/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NoteRoutes from '../../router/noteRoutes';
import type { TrackedStat, AuthUser } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { EmojiPicker } from '../EmojiPicker/index';
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

export const CreateNote = (props: CreateNoteProps) => {
  const [date, setDate] = useState<string>(
    toLocalDateString(new Date())
  );
  const CHARACTER_LIMIT = 200;
  const tagRowRef = useRef<HTMLDivElement>(null);
  const [hasMoreTags, setHasMoreTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('');
  const [tagError, setTagError] = useState('');

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
    if (RESERVED_NOTE_FIELDS.has(icon.name)) {
      // Defense in depth -- this tag is already filtered out of the
      // rendered chip list below, so this should be unreachable, but
      // stays as a safe no-op regardless (rather than visually
      // toggling "active" only for storeNewNote to silently drop it
      // on save, which is worse than doing nothing at all).
      return;
    }
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

  // Client-side mirror of the server's own reserved-name and duplicate
  // checks (trackedStatsSchema) -- for instant feedback, with the
  // server as the final authority regardless.
  const validateNewTagName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Enter a tag name.';
    }
    if (trimmed.length > 30) {
      return 'Tag names must be 30 characters or less.';
    }
    if (RESERVED_NOTE_FIELDS.has(trimmed)) {
      return 'That name is reserved -- please choose a different name.';
    }
    if (props.trackedStats.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return 'You already have a tag with that name.';
    }
    return null;
  };

  const addTrackedStat = (trackedStat: TrackedStat) => {
    props.setTrackedStats([...props.trackedStats, trackedStat]);
    if (props.user) {
      NoteRoutes.postUserStats(props.user, trackedStat);
    }
  };

  const handleAddNewTag = () => {
    const trimmedName = newTagName.trim();
    const error = validateNewTagName(trimmedName);
    if (error) {
      setTagError(error);
      return;
    }
    // New tags start active (visible) immediately -- typing a brand
    // new name is already an explicit signal the user wants it on
    // this note right now, unlike picking an existing suggestion from
    // a list, which only meant "add this as an option."
    addTrackedStat({
      icon: newTagIcon.trim() || '🏷️',
      name: trimmedName,
      visible: 'visible',
    });
    setNewTagName('');
    setNewTagIcon('');
    setTagError('');
  };

  // Quick-add for the 3 built-in suggestions, if not already in the
  // user's own list -- skips the reserved/duplicate checks above since
  // these are known-safe, curated names.
  const availableSuggestions = NOTE_TAG_FIELDS.filter(
    (f) => !props.trackedStats.some((s) => s.name === f.field)
  );
  const handleQuickAdd = (field: string, icon: string) => {
    addTrackedStat({ icon, name: field, visible: 'visible' });
  };

  return (
    <div className="createNoteCard">
      <div className="createNoteTopRow">
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

          {availableSuggestions.length > 0 && (
            <div className="tagSuggestionsRow">
              {availableSuggestions.map((s) => (
                <button
                  key={s.field}
                  type="button"
                  className="tagSuggestionChip"
                  onClick={() => handleQuickAdd(s.field, s.icon)}
                >
                  <span aria-hidden="true">{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="newTagFormRow">
            <div className="newTagForm">
              <EmojiPicker
                value={newTagIcon}
                onSelect={setNewTagIcon}
                ariaLabel="Choose a tag icon"
              />
              <input
                type="text"
                placeholder="New tag name"
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  if (tagError) setTagError('');
                }}
                maxLength={30}
                className="newTagNameInput"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNewTag();
                }}
              />
              <Button onClick={handleAddNewTag} size="small" variant="outlined">
                Add
              </Button>
            </div>
            <Tooltip
              title="You can create your own custom tags -- pick an emoji and give it a name."
              arrow
              placement="top"
            >
              <InfoOutlinedIcon className="newTagInfoIcon" fontSize="small" />
            </Tooltip>
          </div>
          {tagError && <p className="newTagError">{tagError}</p>}

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

      <div className="tagRowWrap">
        <div className="tagRow" ref={tagRowRef}>
        {props.trackedStats?.filter((stat) => stat && !RESERVED_NOTE_FIELDS.has(stat.name)).map((stat, key) => {
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
  );
};