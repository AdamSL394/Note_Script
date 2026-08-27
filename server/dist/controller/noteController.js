"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notes_1 = __importDefault(require("../models/notes"));
const mongoose_1 = __importDefault(require("mongoose"));
const userId_1 = require("../utils/userId");
// The route handler passes req.body here directly (see routes/notes.ts)
// — this is the raw client-submitted note payload, not an Express
// Request object, despite the original parameter being named `req`.
const postNotes = async (noteData) => {
    noteData.userId = (0, userId_1.normalizeUserId)(noteData.userId);
    const newNote = new notes_1.default(noteData);
    // Previously called newNote.save() with a callback but never awaited
    // it, so this function returned 'Success' before the callback had
    // any real chance to run — validation/save errors were essentially
    // always swallowed. Awaiting it directly means a real failure (e.g.
    // a missing required field) now actually surfaces. Mongoose
    // validation errors read like "Note validation failed: ...", which
    // also happens to match the client's existing
    // res.includes('failed') error check in homeView.tsx — that check
    // was already there, it just never had a real error to catch.
    try {
        await newNote.save();
        return 'Success';
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(message);
        return message;
    }
};
const getAllNotesOrdered = async (ids) => {
    const id = new mongoose_1.default.Types.ObjectId(ids.trim());
    const notes = await notes_1.default.find({ userId: id }).sort({ date: -1 }).exec();
    if (notes.length < 1) {
        return [];
    }
    else {
        return notes;
    }
};
const getNoteCount = async (ids) => {
    const id = new mongoose_1.default.Types.ObjectId(ids.trim());
    const count = await notes_1.default.countDocuments({ userId: id });
    return count;
};
const getallNoteYearsAggregate = async (id) => {
    const noteYears = await notes_1.default.aggregate([
        { $match: { userId: { $in: [id] } } },
        {
            $group: {
                _id: { $dateFromString: { format: '%Y-%m-%d', dateString: '$date' } },
            },
        },
        { $sort: { _id: -1 } },
    ]);
    return noteYears;
};
const getAllNotes = async (ids) => {
    const id = new mongoose_1.default.Types.ObjectId(ids.trim());
    const range = await notes_1.default.find({ userId: id }).sort({ date: -1 });
    return range;
};
const getRangeNotes = async (ids, start, end) => {
    const id = new mongoose_1.default.Types.ObjectId(ids.trim());
    const notes = await notes_1.default.find({
        userId: id,
        date: {
            $gte: start,
            $lt: end,
        },
    }).sort({ date: 1 });
    return notes;
};
const getMostRecentlyUpdatedNotes = async (ids) => {
    const id = new mongoose_1.default.Types.ObjectId(ids.trim());
    const updatedNotes = await notes_1.default.find({ userId: id })
        .sort({ updatedAt: -1 })
        .limit(30);
    return updatedNotes;
};
const deleteNotes = async (id, userId) => {
    // Scoped to userId as well as _id — previously any authenticated
    // request could delete any note purely by knowing its _id.
    const result = await notes_1.default.deleteOne({ _id: id, userId });
    return result.deletedCount > 0 ? 'note deleted' : 'not found';
};
// NOTE: 12 positional string/boolean parameters is a real design smell —
// it's easy for a future caller to accidentally transpose two same-typed
// arguments (e.g. swap `look` and `gym`), and since they're positionally
// interchangeable to the type checker, TypeScript wouldn't catch that
// mistake. Left as-is to match the existing call site in routes/notes.ts
// rather than changing the calling convention unprompted, but this is a
// good candidate for a follow-up refactor to a single options object.
const updateNote = async (id, userId, switchEdit, text, date, star, look, gym, weed, code, read, eatOut, basketball) => {
    // Switched from findByIdAndUpdate (which only filters by _id) to
    // findOneAndUpdate with a compound filter — previously any
    // authenticated request could edit any note purely by knowing its
    // _id, with no check that it belonged to the requester.
    const updated = await notes_1.default.findOneAndUpdate({ _id: id, userId }, {
        $set: {
            edit: switchEdit,
            text: text,
            date: date,
            star: star,
            look: look,
            gym: gym,
            weed: weed,
            code: code,
            read: read,
            eatOut: eatOut,
            basketball: basketball,
            updatedAt: Date.now(),
        },
    }, { new: true });
    return updated;
};
// Rewritten from the chainable .aggregate().search({...}).match({...})
// form to the standard array-pipeline form. Both produce the identical
// MongoDB pipeline — the chainable .search()/.match() helpers are just
// convenience wrappers that append the same stage objects — but the
// array form is the one reliably covered by Mongoose's TypeScript
// definitions across versions, whereas the Atlas-Search-specific
// chainable helper may not be. Behavior is unchanged.
const searchNotes = async (text, userId) => {
    const notes = await notes_1.default.aggregate([
        {
            $search: {
                text: {
                    query: text,
                    path: 'text',
                    fuzzy: {
                        maxEdits: 2,
                    },
                },
            },
        },
        {
            $match: {
                userId,
            },
        },
    ]);
    return notes;
};
const getSingleNote = async (id, userId) => {
    // Scoped to userId as well as _id — previously any authenticated
    // request could fetch any note purely by guessing/observing its
    // _id, with no check that it actually belonged to the requester.
    const note = await notes_1.default.find({ _id: id, userId }).exec();
    return note;
};
const uploadNotes = async (note) => {
    const newNote = new notes_1.default({
        text: note.text,
        date: note.date,
        star: note.star,
        userId: note.userId,
    });
    try {
        const savedNote = await newNote.save();
        return savedNote === newNote ? 'correct' : 'incorrect';
    }
    catch (err) {
        return 'incorrect';
    }
};
exports.default = {
    postNotes,
    getAllNotes,
    getNoteCount,
    deleteNotes,
    updateNote,
    getRangeNotes,
    searchNotes,
    getAllNotesOrdered,
    getSingleNote,
    uploadNotes,
    getallNoteYearsAggregate,
    getMostRecentlyUpdatedNotes,
};
