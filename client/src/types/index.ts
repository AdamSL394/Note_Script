// Matches server/models/notes.js's NoteSchema.
export interface TagSnapshot {
  name: string;
  icon: string;
}

export interface Note {
  _id: string;
  userId: string;
  text: string;
  date: string; // stored as 'YYYY-MM-DD', not a real Date
  star: string; // '1' | '2' | '3' | 'None' — schema types this as
  // String even though it's really a small enum; kept loose here to
  // match the actual server behavior rather than over-promising.
  edit: boolean;
  // The source of truth for tags going forward -- any tag name is
  // just a string in this array. Optional on the type since a note
  // fetched from an unmigrated part of the database, or one created
  // by very old cached client code, might not have it populated yet;
  // display logic should treat a missing tags array the same as an
  // empty one, never assume it's always present.
  // Each tag snapshots both the name AND the icon as they were when
  // the tag was applied to this note -- not just a name re-resolved
  // against the user's current settings every time it's displayed.
  // Missing/undefined should be treated the same as an empty array,
  // never assumed to always be present.
  tags?: TagSnapshot[];
  // Legacy flat fields -- kept optional here since the server still
  // accepts them from the currently-live client during the transition
  // (see server's backward-compat shim in noteController.ts). New
  // code should read/write `tags` exclusively; these are read-path
  // compatibility only, not something new code should ever set.
  look?: boolean;
  gym?: boolean;
  weed?: boolean;
  code?: boolean;
  read?: boolean;
  eatOut?: boolean;
  medal?: boolean;
  king?: boolean;
  'date/smoosh'?: boolean;
  basketball?: boolean;
  updatedAt: string;
  // Client-only, computed field (characters remaining while editing).
  // Never comes from the server — added by CreateNote/notes/Textarea
  // while a note is being edited.
  textLength?: number;
}

// The shape used both for CreateNote's emoji picker list and for a
// user's saved tracked-stat settings (server/models/user.js's
// `settings` array).
export interface TrackedStat {
  icon: string;
  name: string;
  visible: 'visible' | 'hidden';
}

// Matches server/models/user.js's UserSchema.
export interface UserRecord {
  _id: string;
  email: string;
  settings: TrackedStat[];
  role: 'user' | 'admin';
}

// The wrapper shape /api/users/user/:id actually responds with
// (see server/routes/userSettings.js).
// The subset of Auth0's user object actually used across this app —
// not the full Auth0 User type, to avoid an unnecessary dependency here.
export interface AuthUser {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface UserInfoResponse {
  searchedUser: UserRecord;
}