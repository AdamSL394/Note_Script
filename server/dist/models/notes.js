"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const NoteSchema = new mongoose_1.Schema({
    'userId': { type: String, required: true },
    'text': { type: String, required: true },
    'date': { type: String, required: true },
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
    'star': { type: String, default: 'None' },
    'edit': { type: Boolean, default: false },
    'look': { type: Boolean, default: false },
    'gym': { type: Boolean, default: false },
    'weed': { type: Boolean, default: false },
    'code': { type: Boolean, default: false },
    'read': { type: Boolean, default: false },
    'eatOut': { type: Boolean, default: false },
    'medal': { type: Boolean, default: false },
    'king': { type: Boolean, default: false },
    'date/smoosh': { type: Boolean, default: false },
    'basketball': { type: Boolean, default: false },
    'updatedAt': { type: Date, default: Date.now },
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
// Every note query (getAllNotes, getRangeNotes, deleteNotes, updateNote,
// getSingleNote, getMostRecentlyUpdatedNotes) filters by userId, and
// several also sort by date — there was no index supporting either,
// meaning every one of those queries did a full collection scan. This
// compound index covers the userId-filter + date-sort pattern used
// throughout noteController.ts.
NoteSchema.index({ userId: 1, date: -1 });
const Note = mongoose_1.default.model('Note', NoteSchema);
exports.default = Note;
