// Every boolean tag field a Note can carry, in the order they should
// render. Both the read-only card views (Note, TrackedEmojis,
// NotesHomeView) and the editable/creation forms (EditingTrackedEmojis,
// CreateNote) build off this single list, so adding a new tag means
// adding one entry here instead of hand-copying it into every file that
// renders or toggles tags — which is what had happened previously
// (Note/index.tsx, TrackedEmojis, EditingTrackedEmojis, NotesHomeView,
// and CreateNote each kept their own separately hand-typed copy, and
// they'd drifted: the editable views only knew about 7 of the 10 real
// tag fields, silently missing king/medal/date-smoosh).
export interface NoteFieldConfig {
  field: string;
  icon: string;
  label: string;
}

export const NOTE_TAG_FIELDS: NoteFieldConfig[] = [
  { field: 'look', icon: '👀', label: 'Eyes' },
  { field: 'gym', icon: '💪🏼', label: 'Arm' },
  { field: 'weed', icon: '🍁', label: 'Leaf' },
  { field: 'code', icon: '👨🏻\u200d💻', label: 'Computer guy' },
  { field: 'read', icon: '📚', label: 'Books' },
  { field: 'eatOut', icon: '🍕', label: 'Pizza' },
  { field: 'basketball', icon: '⛹🏻\u200d♂️', label: 'Basketball' },
  { field: 'king', icon: '🤴🏻', label: 'King' },
  { field: 'medal', icon: '🥇', label: 'Medal' },
  { field: 'ice', icon: '👫', label: 'Date' },
  { field: 'coffee', icon: '☕️', label: 'Coffee' },
];

// Tags that count as a "win" — gets the amber accent wherever notes are
// rendered, and marks a day as a win on the home streak strip. Was
// separately redefined in CreateNote, NotesHomeView, homeView, and
// userSettings.
export const WIN_TAGS: string[] = ['medal', 'king'];
