import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
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
    // `default: false` on a String-typed field is an odd mismatch — a
    // boolean default value for a field that's supposed to hold string
    // star-ratings ('1'/'2'/'3'/'None' per the client's usage). Left
    // exactly as-is since I don't know if existing documents rely on
    // this, but worth a look.
    'star': {type: String, default: false},
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
    // Was `default: Date.now()` — calling the function immediately
    // evaluates it ONCE at schema-definition time (server startup), so
    // every note ever created got the exact same frozen timestamp
    // (whenever the server last restarted), not its actual creation
    // time. `default: Date.now` (no parens) passes the function itself,
    // so Mongoose calls it fresh for each new document — the standard,
    // well-known fix for this exact Mongoose gotcha.
    'updatedAt': {type: Date, default: Date.now},

});

// This includes `name: 'text'`, but there's no `name` field anywhere on
// this schema — looks like a leftover/mistake. Left exactly as-is since
// touching a live text index without knowing the current index state on
// your actual database is genuinely risky; flagging rather than fixing.
NoteSchema.index({name:'text', 'text': 'text'})

const Note: Model<INote> = mongoose.model<INote>('Note', NoteSchema);


export default Note;