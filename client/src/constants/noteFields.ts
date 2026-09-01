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
  { field: 'date/smoosh', icon: '👫', label: 'Date' },
  { field: 'starred', icon: '🌟', label: 'Starred' },
  { field: 'coffee', icon: '☕', label: 'Coffee' },
];

// Tags that count as a "win" — gets the amber accent wherever notes are
// rendered, and marks a day as a win on the home streak strip. Was
// separately redefined in CreateNote, NotesHomeView, homeView, and
// userSettings.
export const WIN_TAGS: string[] = ['medal', 'king'];

// Every non-tag field the Note schema actually uses (server/models/
// notes.ts). A custom or built-in tag sharing one of these names would
// silently overwrite that real field instead of behaving as a tag --
// this is exactly what happened with a built-in 'star' tag colliding
// with the note's own star RATING field, corrupting it with a boolean
// and breaking every subsequent save (400: invalid enum value). Used
// as a guard everywhere a tag gets toggled, so this class of bug can't
// recur even if a future tag name happens to collide with a field
// added to the schema later.
export const RESERVED_NOTE_FIELDS = new Set([
  '_id',
  'userId',
  'text',
  'date',
  'star',
  'edit',
  'updatedAt',
  'textLength',
]);
