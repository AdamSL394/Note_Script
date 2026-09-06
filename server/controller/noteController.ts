import Note, { INote, ITagSnapshot } from '../models/notes';
import mongoose from 'mongoose';
import { normalizeUserId } from '../utils/userId';
import { logger } from '../logger';

// getAllNotesOrdered isn't called from the UI (confirmed dead client-side
// during a pagination audit — client/src/router/noteRoutes.ts defines a
// wrapper for it, but nothing ever calls that wrapper), so it keeps the
// blanket safety cap below rather than real pagination. If that changes,
// it should get the same treatment as getAllNotes.
const MAX_NOTES_RETURNED = 2000;

interface NoteYearAggregateResult {
    _id: string;
}

// The route handler passes req.body here directly (see routes/notes.ts)
// — this is the raw client-submitted note payload, not an Express
// Request object, despite the original parameter being named `req`.
const postNotes = async (
    noteData: Partial<INote> & { userId: string }
): Promise<string> => {
    noteData.userId = normalizeUserId(noteData.userId);
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
        logger.error({ err }, 'Failed to save new note');
        return message;
    }
};

const getAllNotesOrdered = async (ids: string): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const notes = await Note.find({ userId: id }).sort({ date: -1 }).limit(MAX_NOTES_RETURNED).exec();
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

export interface PaginatedNotes {
    notes: INote[];
    totalCount: number;
}

const MAX_PAGE_SIZE = 100;

// Real pagination — was a blanket .limit(2000) with no way to ever get
// past the 2000th note (silently truncated, no error, no indication to
// the user that older notes existed and were being hidden). Now the
// caller drives skip/limit via page/pageSize, and totalCount lets the
// client compute how many pages exist and actually reach all of them.
const getAllNotes = async (
    ids: string,
    page: number,
    pageSize: number,
    sortDirection: 'asc' | 'desc' = 'desc'
): Promise<PaginatedNotes> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const clampedPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const clampedPage = Math.max(1, page);
    const skip = (clampedPage - 1) * clampedPageSize;

    const [notes, totalCount] = await Promise.all([
        Note.find({ userId: id })
            .sort({ date: sortDirection === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(clampedPageSize),
        Note.countDocuments({ userId: id }),
    ]);

    return { notes, totalCount };
};

// countDocuments() rather than find().length — avoids pulling every
// note document over the wire just to count them, which matters once a
// user has hundreds/thousands of notes.
const getNoteCount = async (ids: string): Promise<number> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const count = await Note.countDocuments({ userId: id });
    return count;
};

const getRangeNotes = async (
    ids: string,
    start: string,
    end: string,
    sortDirection: 'asc' | 'desc' = 'desc'
): Promise<INote[]> => {
    const id = new mongoose.Types.ObjectId(ids.trim());
    const notes = await Note.find({
        userId: id,
        date: {
            $gte: start,
            $lte: end,
        },
    }).sort({ date: sortDirection === 'asc' ? 1 : -1 });
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

interface UpdateNoteOptions {
    edit: boolean;
    text: string;
    date: string;
    star: string;
    tags?: ITagSnapshot[];
    // Legacy fields, accepted from the currently-live client during the
    // gap before it's updated to send `tags` directly. See the
    // reconciliation logic below for how these get merged.
    look?: boolean;
    gym?: boolean;
    weed?: boolean;
    code?: boolean;
    read?: boolean;
    eatOut?: boolean;
    basketball?: boolean;
}

const LEGACY_UPDATE_FIELDS = ['look', 'gym', 'weed', 'code', 'read', 'eatOut', 'basketball'] as const;

// The fixed, known icons these built-in fields have always had --
// unlike an arbitrary custom tag (which the migration script resolves
// dynamically per-user), these never varied, so there's nothing to
// look up here.
const LEGACY_FIELD_ICONS: Record<(typeof LEGACY_UPDATE_FIELDS)[number], string> = {
    look: '👀',
    gym: '💪🏼',
    weed: '🍁',
    code: '👨🏻\u200d💻',
    read: '📚',
    eatOut: '🍕',
    basketball: '⛹🏻\u200d♂️',
};

const updateNote = async (
    id: string,
    userId: string,
    options: UpdateNoteOptions,
): Promise<INote | null> => {
    const setFields: Record<string, unknown> = {
        edit: options.edit,
        text: options.text,
        date: options.date,
        star: options.star,
        updatedAt: Date.now(),
    };

    if (options.tags !== undefined) {
        // New-format client: tags sent directly, use as-is.
        setFields.tags = options.tags;
    } else {
        const record = options as unknown as Record<string, unknown>;
        const sentAnyLegacyField = LEGACY_UPDATE_FIELDS.some((f) => record[f] !== undefined);
        if (sentAnyLegacyField) {
            // Old-format client: reconcile whichever legacy boolean
            // fields it sent into real tag snapshots, so data stays
            // consistent in the new format regardless of which client
            // format actually made this request.
            setFields.tags = LEGACY_UPDATE_FIELDS.filter((f) => record[f] === true).map(
                (f): ITagSnapshot => ({ name: f, icon: LEGACY_FIELD_ICONS[f] })
            );
        }
        // If neither tags nor any legacy field was sent (only
        // text/date/star changed), tags is left out of $set entirely --
        // deliberately NOT overwritten with an empty array, which would
        // silently wipe out whatever tags this note already had.
    }

    // Switched from findByIdAndUpdate (which only filters by _id) to
    // findOneAndUpdate with a compound filter — previously any
    // authenticated request could edit any note purely by knowing its
    // _id, with no check that it belonged to the requester.
    const updated = await Note.findOneAndUpdate(
        { _id: id, userId },
        { $set: setFields },
        { new: true },
    );
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
    } catch {
        return 'incorrect';
    }
};

export default {
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