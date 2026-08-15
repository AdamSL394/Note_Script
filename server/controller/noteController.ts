import Note, { INote } from '../models/notes';
import mongoose from 'mongoose';

interface NoteYearAggregateResult {
    _id: string;
}

// The route handler passes req.body here directly (see routes/notes.ts)
// — this is the raw client-submitted note payload, not an Express
// Request object, despite the original parameter being named `req`.
const postNotes = async (
    noteData: Partial<INote> & { userId: string }
): Promise<string> => {
    if (noteData.userId.length != 24) {
        noteData.userId = noteData.userId + '000';
    }
    const newNote = new Note(noteData);
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
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(message);
        return message;
    }
};

const getAllNotesOrdered = async (ids: string): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const notes = await Note.find({ userId: id }).sort({ date: -1 }).exec();
    if (notes.length < 1) {
        return [];
    } else {
        return notes;
    }
};

const getallNoteYearsAggregate = async (
    id: string
): Promise<NoteYearAggregateResult[]> => {
    const noteYears = await Note.aggregate<NoteYearAggregateResult>([
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

const getAllNotes = async (ids: string): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const range = await Note.find({ userId: id }).sort({ date: -1 });

    return range;
};

const getRangeNotes = async (
    ids: string,
    start: string,
    end: string
): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const notes = await Note.find({
        userId: id,
        date: {
            $gte: start,
            $lt: end,
        },
    }).sort({ date: 1 });
    return notes;
};

const getMostRecentlyUpdatedNotes = async (ids: string): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const updatedNotes = await Note.find({ userId: id })
        .sort({ updatedAt: -1 })
        .limit(30);
    return updatedNotes;
};

const deleteNotes = async (id: string, userId: string): Promise<string> => {
    // Scoped to userId as well as _id — previously any authenticated
    // request could delete any note purely by knowing its _id.
    const result = await Note.deleteOne({ _id: id, userId });
    return result.deletedCount > 0 ? 'note deleted' : 'not found';
};

// NOTE: 12 positional string/boolean parameters is a real design smell —
// it's easy for a future caller to accidentally transpose two same-typed
// arguments (e.g. swap `look` and `gym`), and since they're positionally
// interchangeable to the type checker, TypeScript wouldn't catch that
// mistake. Left as-is to match the existing call site in routes/notes.ts
// rather than changing the calling convention unprompted, but this is a
// good candidate for a follow-up refactor to a single options object.
const updateNote = async (
    id: string,
    userId: string,
    switchEdit: boolean,
    text: string,
    date: string,
    star: string,
    look: boolean,
    gym: boolean,
    weed: boolean,
    code: boolean,
    read: boolean,
    eatOut: boolean,
    basketball: boolean,
): Promise<INote | null> => {
    // Switched from findByIdAndUpdate (which only filters by _id) to
    // findOneAndUpdate with a compound filter — previously any
    // authenticated request could edit any note purely by knowing its
    // _id, with no check that it belonged to the requester.
    const updated = await Note.findOneAndUpdate(
        { _id: id, userId },
        {
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
        },
        { new: true },
    );
    console.log("updated", updated)
    return updated;
};

// Rewritten from the chainable .aggregate().search({...}).match({...})
// form to the standard array-pipeline form. Both produce the identical
// MongoDB pipeline — the chainable .search()/.match() helpers are just
// convenience wrappers that append the same stage objects — but the
// array form is the one reliably covered by Mongoose's TypeScript
// definitions across versions, whereas the Atlas-Search-specific
// chainable helper may not be. Behavior is unchanged.
const searchNotes = async (text: string, userId: string): Promise<INote[]> => {
    const notes = await Note.aggregate<INote>([
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

const getSingleNote = async (id: string, userId: string): Promise<INote[]> => {
    // Scoped to userId as well as _id — previously any authenticated
    // request could fetch any note purely by guessing/observing its
    // _id, with no check that it actually belonged to the requester.
    const note = await Note.find({ _id: id, userId }).exec();
    return note;
};

interface UploadNoteInput {
    text: string;
    date: string;
    star: string;
    userId: string;
}

const uploadNotes = async (note: UploadNoteInput): Promise<string> => {
    const newNote = new Note({
        text: note.text,
        date: note.date,
        star: note.star,
        userId: note.userId,
    });
    try {
        const savedNote = await newNote.save();
        return savedNote === newNote ? 'correct' : 'incorrect';
    } catch (err) {
        return 'incorrect';
    }
};

export default {
    postNotes,
    getAllNotes,
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