import { useEffect, useRef, useState } from 'react';
import { toLocalDateString } from '../../utils/date';
import { getTagColor } from '../../utils/tagColor';
import TextField from '@mui/material/TextField/index.js';
import Button from '@mui/material/Button/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import IconButton from '@mui/material/IconButton/index.js';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import NoteRoutes from '../../router/noteRoutes';
import type { TrackedStat, AuthUser, ChecklistItem } from '../../types';
import { NOTE_TAG_FIELDS, WIN_TAGS, RESERVED_NOTE_FIELDS } from '../../constants/noteFields';
import { EmojiPicker } from '../EmojiPicker/index';
import { ScrollableChipRow } from '../ScrollableChipRow/index';
import './createNote.css';

interface CreateNoteProps {
  disabled: boolean;
  trackedStats: TrackedStat[];
  setTrackedStats: (stats: TrackedStat[]) => void;
  user: AuthUser | undefined;
  text: string | undefined;
  setText: (text: string) => void;
  checklist: ChecklistItem[];
  setChecklist: (checklist: ChecklistItem[]) => void;
  storeNewNote: (
    stats: TrackedStat[],
    date: string | undefined,
    checklist: ChecklistItem[]
  ) => void;
  hasSeenOnboardingDemo?: boolean;
}

const MAX_CHECKLIST_ITEMS = 15;

export const CreateNote = (props: CreateNoteProps) => {
  const [date, setDate] = useState<string>(
    toLocalDateString(new Date())
  );
  const CHARACTER_LIMIT = 200;
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('');
  const [tagError, setTagError] = useState('');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  // Progressive disclosure: only the item at this index is ever
  // rendered as a bordered, editable input -- every other item is a
  // compact checkbox+text row. Keeps a long checklist from turning
  // into a wall of input boxes.
  const [activeChecklistIndex, setActiveChecklistIndex] = useState<number | null>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);
  // Guards against handleChecklistBlur re-processing the same
  // commit that handleChecklistKeyDown's Enter handler already
  // resolved -- Enter fires, moves focus (or removes the input),
  // and that focus change triggers a blur on the same element in
  // the same gesture.
  const justHandledEnterRef = useRef(false);

  useEffect(() => {
    if (activeChecklistIndex !== null) {
      checklistInputRef.current?.focus();
    }
  }, [activeChecklistIndex]);

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

  // One-time demo: types a short example sentence into the note
  // textbox, then selects a starter tag, for a genuinely new user who
  // hasn't seen it before (server-tracked, not localStorage, so it
  // plays exactly once per account regardless of which device they're
  // on) and whose textbox is currently empty (never interrupts
  // something the user's already begun writing themselves).
  //
  // Deliberately NOT interruptible -- an earlier version tried to
  // detect and cancel on any mouse/keyboard interaction, but that
  // proved unreliable and made the demo feel broken rather than
  // helpful (it could stop from something as small as moving the
  // mouse). Instead, the demo now always plays through fully once
  // triggered, and the textbox is made read-only only for the short
  // duration it's actively running -- this also prevents a stray
  // keystroke from racing against the demo's own typing (both would
  // otherwise write to the same text state unpredictably).
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  useEffect(() => {
    if (props.hasSeenOnboardingDemo || props.text) {
      return;
    }
    const demoText = 'This is how you write a note. Try tagging it below!';
    setIsDemoPlaying(true);
    let i = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const typeNextChar = () => {
      if (cancelled) return;
      if (i >= demoText.length) {
        // Typing finished -- pause, then select the seeded starter
        // tag so its selected/highlighted state is visible too.
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            const welcomeTag = props.trackedStats.find((s) => s.name === 'welcome');
            if (welcomeTag) {
              setCodeIcon(welcomeTag);
            }
            setIsDemoPlaying(false);
            NoteRoutes.markOnboardingDemoSeen();
          }, 600)
        );
        return;
      }
      props.setText(demoText.slice(0, i + 1));
      i++;
      timers.push(setTimeout(typeNextChar, 35));
    };

    timers.push(setTimeout(typeNextChar, 500));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Deliberately re-runs only when hasSeenOnboardingDemo itself
    // changes (e.g. from its default `true` to the real fetched
    // value), not on every trackedStats/text change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.hasSeenOnboardingDemo]);

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
      // Persist the stat as a defined option (hidden), never as
      // "selected for this note" -- that's ephemeral, per-compose-
      // session state, and persisting it as visible here is what
      // made a tag reappear pre-selected on a future note even after
      // this note's own save had already reset it locally.
      NoteRoutes.postUserStats(props.user, { ...trackedStat, visible: 'hidden' });
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

  // ---- Checklist ----

  const addChecklistItem = () => {
    if (props.checklist.length >= MAX_CHECKLIST_ITEMS) return;
    const next = [...props.checklist, { text: '', checked: false }];
    props.setChecklist(next);
    setActiveChecklistIndex(next.length - 1);
  };

  const editChecklistItem = (index: number) => {
    setActiveChecklistIndex(index);
  };

  const updateChecklistItemText = (index: number, text: string) => {
    const next = props.checklist.map((item, i) =>
      i === index ? { ...item, text } : item
    );
    props.setChecklist(next);
  };

  const toggleChecklistItemChecked = (index: number) => {
    const next = props.checklist.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    props.setChecklist(next);
  };

  const removeChecklistItem = (index: number) => {
    const next = props.checklist.filter((_, i) => i !== index);
    props.setChecklist(next);
    if (activeChecklistIndex === index) {
      setActiveChecklistIndex(null);
    }
  };

  // Commits (or discards, if left empty) whichever item is currently
  // active, and closes the input -- shared resolution logic for both
  // pressing Enter and clicking/tabbing away.
  const resolveActiveChecklistItem = () => {
    if (activeChecklistIndex === null) return;
    const item = props.checklist[activeChecklistIndex];
    if (!item) {
      setActiveChecklistIndex(null);
      return;
    }
    if (item.text.trim().length === 0) {
      // Discard an item left empty -- there's nothing useful to save,
      // and leaving an empty row behind would just be clutter.
      removeChecklistItem(activeChecklistIndex);
      return;
    }
    setActiveChecklistIndex(null);
  };

  const handleChecklistKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    justHandledEnterRef.current = true;
    const item = props.checklist[index];
    if (item && item.text.trim().length === 0) {
      removeChecklistItem(index);
      return;
    }
    // Enter commits the current item and, if there's room, opens a
    // fresh one right after it -- matches the "type, hit enter, keep
    // going" rhythm of a real checklist app.
    if (props.checklist.length < MAX_CHECKLIST_ITEMS) {
      addChecklistItem();
    } else {
      setActiveChecklistIndex(null);
    }
  };

  const handleChecklistBlur = () => {
    if (justHandledEnterRef.current) {
      justHandledEnterRef.current = false;
      return;
    }
    resolveActiveChecklistItem();
  };

  // Computes the checklist as it should actually be saved, resolving
  // any still-active/empty item synchronously -- used instead of
  // relying on props.checklist directly, since that state may not
  // have caught up yet if the user clicks "Add note" while an item is
  // still mid-edit (no Enter/blur has fired for it yet). Without this,
  // storeNewNote could read a stale/incomplete checklist -- the exact
  // race that caused notes with checklist items to sometimes save
  // incorrectly.
  const resolveChecklistForSave = (): ChecklistItem[] => {
    if (activeChecklistIndex === null) return props.checklist;
    const item = props.checklist[activeChecklistIndex];
    if (!item || item.text.trim().length === 0) {
      return props.checklist.filter((_, i) => i !== activeChecklistIndex);
    }
    return props.checklist;
  };

  const handleSaveClick = () => {
    const resolved = resolveChecklistForSave();
    if (resolved !== props.checklist) {
      props.setChecklist(resolved);
    }
    setActiveChecklistIndex(null);
    props.storeNewNote(props.trackedStats, date, resolved);
  };

  return (
    <div className="createNoteCard">
      <div className="notesChecklistRow">
        <div className="notesPanel">
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
            InputProps={{
              readOnly: isDemoPlaying,
              style: { fontFamily: 'var(--font-serif)', fontSize: '15px' },
            }}
          />
        </div>

        <div className="checklistPanel">
          <p className="composeHeading">Checklist</p>
          <div className="checklistScrollArea">
            {props.checklist.map((item, index) => {
              const isActive = activeChecklistIndex === index;
              if (isActive) {
                return (
                  <div className="checklistItemActive" key={index}>
                    <input
                      ref={checklistInputRef}
                      type="text"
                      value={item.text}
                      placeholder="Checklist item"
                      maxLength={200}
                      // Shows an explicit "Done" key on mobile virtual
                      // keyboards (which have no physical Enter key) --
                      // modern mobile browsers fire a real Enter
                      // keydown when it's tapped, so the same
                      // handleChecklistKeyDown handles it. The
                      // existing blur-based commit below is the
                      // fallback either way.
                      enterKeyHint="done"
                      onChange={(e) => updateChecklistItemText(index, e.target.value)}
                      onKeyDown={(e) => handleChecklistKeyDown(e, index)}
                      onBlur={handleChecklistBlur}
                    />
                  </div>
                );
              }
              return (
                <div className="checklistItemFilled" key={index}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItemChecked(index)}
                    aria-label={`Mark "${item.text}" as done`}
                  />
                  <span
                    className={item.checked ? 'checklistItemTextDone' : 'checklistItemText'}
                    onClick={() => editChecklistItem(index)}
                  >
                    {item.text}
                  </span>
                  <IconButton
                    size="small"
                    aria-label="Remove checklist item"
                    onClick={() => removeChecklistItem(index)}
                    className="checklistRemoveButton"
                  >
                    <CloseIcon style={{ fontSize: '14px' }} />
                  </IconButton>
                </div>
              );
            })}
          </div>
          {props.checklist.length < MAX_CHECKLIST_ITEMS && (
            <button type="button" className="addChecklistItemButton" onClick={addChecklistItem}>
              + Checklist item
            </button>
          )}
        </div>
      </div>

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

      <div className="sharedActionRow">
        <TextField
          type="date"
          label="Date"
          size="small"
          className="sharedActionDate"
          value={date ?? ''}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <ScrollableChipRow ariaLabel="Select tags for this note">
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
                        borderColor: tagColor.text,
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
        </ScrollableChipRow>

        <Tooltip title={showNewTagForm ? 'Close' : 'Create a new tag'}>
          <IconButton
            size="small"
            className="tagCreateToggle"
            aria-label={showNewTagForm ? 'Close new tag form' : 'Create a new tag'}
            onClick={() => setShowNewTagForm((v) => !v)}
          >
            {showNewTagForm ? (
              <CloseIcon style={{ fontSize: '16px' }} />
            ) : (
              <AddIcon style={{ fontSize: '16px' }} />
            )}
          </IconButton>
        </Tooltip>

        <Button
          className="saveEntryButton"
          disabled={props.disabled}
          variant="contained"
          value="save"
          onClick={handleSaveClick}
          sx={{
            backgroundColor: 'var(--ns-blue)',
            '&:hover': { backgroundColor: 'var(--ns-blue)', opacity: 0.9 },
          }}
        >
          Add note
        </Button>
      </div>

      {showNewTagForm && (
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
      )}
      {tagError && <p className="newTagError">{tagError}</p>}
    </div>
  );
};
