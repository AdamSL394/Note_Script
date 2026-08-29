import mongoose, { Schema, Model } from 'mongoose';

// Deliberately NOT extending Document — see models/user.ts for why.
export interface INote {
    userId: string;
    text: string;
    date: string;
    star: string;
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
    updatedAt: Date;
}

const NoteSchema = new Schema<INote>({
    'userId': {type: String, required: true},
    'text': {type: String, required: true},
    'date': {type: String, required: true},
    // Was `default: false` — a boolean default on a String-typed field
    // that's supposed to hold '1'/'2'/'3'/'None' (see the client's
    // renderStars/star-select usage). Mongoose cast that default to the
    // string "false" on save, which the client's `=== 'None'` check
    // never matches — so a note saved without a star silently didn't
    // render as "no rating" the way the rest of the app expects.
    // Existing documents already saved with "false" are unaffected by
    // this change (it only affects the default going forward); a
    // one-time migration to normalize old "false" values to 'None' is
    // a separate, optional cleanup.
    'star': {type: String, default: 'None'},
    'edit': {type: Boolean, default: false},
    'look': {type: Boolean, default: false},
    'gym': {type: Boolean, default: false},
    'weed': {type: Boolean, default: false},
    'code': {type: Boolean, default: false},
    'read': {type: Boolean, default: false},
    'eatOut': {type: Boolean, default: false},
    'medal': {type: Boolean, default: false},
    'king': {type: Boolean, default: false},
    'date/smoosh': {type: Boolean, default: false},
    'basketball': {type: Boolean, default: false},
    'updatedAt': {type: Date, default: Date.now},

});

// Was `{ name: 'text', text: 'text' }` — 'name' isn't a field on this
// schema at all, so that half of the index definition was pointing at
// nothing. The real intent (per searchNotes' $search stage in
// noteController.ts) is a text index on the `text` field alone.
//
// NOTE ON DEPLOYING THIS: Mongoose doesn't auto-drop/rename an existing
// index just because the schema definition changed. If the old
// `{name:'text', text:'text'}` index already exists on your live
// database, this new definition won't replace it automatically — either
// drop the old index manually (`db.notes.dropIndex(...)`) or call
// `Note.syncIndexes()` once during a deploy/migration step.
NoteSchema.index({ text: 'text' });

// Every note query that filters by userId and sorts by *date*
// (getAllNotes, getAllNotesOrdered, getRangeNotes, deleteNotes,
// updateNote, getSingleNote) is covered by this compound index.
NoteSchema.index({ userId: 1, date: -1 });

// getMostRecentlyUpdatedNotes sorts by updatedAt, not date — a
// previous comment on the index above incorrectly claimed it covered
// this function too. It didn't: the userId filter benefited from that
// index's prefix, but the sort itself still fell back to an in-memory
// sort since updatedAt isn't part of it. This index covers that query
// specifically.
NoteSchema.index({ userId: 1, updatedAt: -1 });

const Note: Model<INote> = mongoose.model<INote>('Note', NoteSchema);


export default Note;