// Matches server/models/notes.js's NoteSchema.
export interface Note {
  _id: string;
  userId: string;
  text: string;
  date: string; // stored as 'YYYY-MM-DD', not a real Date
  star: string; // '1' | '2' | '3' | 'None' — schema types this as
  // String even though it's really a small enum; kept loose here to
  // match the actual server behavior rather than over-promising.
  edit: boolean;
  look: boolean;
  gym: boolean;
  weed: boolean;
  code: boolean;
  read: boolean;
  eatOut: boolean;
  medal: boolean;
  king: boolean;
  'date/smoosh': boolean;
  basketball: boolean;
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