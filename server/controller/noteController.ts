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

export interface TagAnalyticsResult {
    name: string;
    icon: string;
    count: number;
    // null when no note using this tag has ever had a numeric star
    // rating (i.e. every use was 'None') -- distinct from 0, which
    // would incorrectly imply a real, low average.
    avgStar: number | null;
}

// Per-tag note count and average star rating, across every note a user
// has ever written (not scoped to any particular date range -- this is
// meant to answer "over time, what does this tag correlate with",
// which needs the full history, not just whatever Look Back window
// happens to be selected on Home).
const getTagAnalytics = async (id: string): Promise<TagAnalyticsResult[]> => {
    const results = await Note.aggregate<TagAnalyticsResult & { _id: string }>([
        { $match: { userId: id } },
        // Descending by date so $first below (in the $group stage)
        // captures each tag's most recently-used icon, not an
        // arbitrary one.
        { $sort: { date: -1 } },
        { $unwind: '$tags' },
        {
            $addFields: {
                // Only '1'/'2'/'3' represent a real numeric rating;
                // 'None' (and any other non-numeric value) becomes
                // null here so $avg excludes it automatically instead
                // of $toInt throwing or silently coercing it to 0.
                starNumeric: {
                    $cond: [
                        { $in: ['$star', ['1', '2', '3']] },
                        { $toInt: '$star' },
                        null,
                    ],
                },
            },
        },
        {
            $group: {
                _id: '$tags.name',
                icon: { $first: '$tags.icon' },
                count: { $sum: 1 },
                avgStar: { $avg: '$starNumeric' },
            },
        },
        { $sort: { count: -1 } },
    ]);
    return results.map(({ _id, icon, count, avgStar }) => ({ name: _id, icon, count, avgStar }));
};

const TREND_PERIOD_LENGTHS = { week: 7, month: 30, year: 365 } as const;
export type TrendPeriod = keyof typeof TREND_PERIOD_LENGTHS;

function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Trailing, equal-length periods (e.g. "last 7 days" vs "the 7 days
// before that") rather than calendar boundaries (e.g. "this month" vs
// "last month") -- calendar boundaries would compare a partial current
// month against a full previous one, which isn't a fair comparison.
// Exported for direct testing of the date arithmetic itself, separate
// from the database aggregation built on top of it.
export function computeTrendPeriodBoundaries(
    period: TrendPeriod,
    today: Date = new Date()
): { currentStart: string; previousStart: string } {
    const days = TREND_PERIOD_LENGTHS[period];
    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - (days - 1));
    const previousStart = new Date(today);
    previousStart.setDate(previousStart.getDate() - (2 * days - 1));
    return {
        currentStart: toDateString(currentStart),
        previousStart: toDateString(previousStart),
    };
}

export interface TagTrendResult {
    name: string;
    icon: string;
    currentCount: number;
    previousCount: number;
    // null when previousCount is 0 -- a percentage change from zero is
    // undefined, not infinite or 0, so this is surfaced as 'new'
    // usage rather than a misleading number.
    percentChange: number | null;
    direction: 'up' | 'down' | 'flat' | 'new' | 'dropped';
}

// Compares each tag's usage between two adjacent trailing periods of
// the requested length. A single aggregation pass covers both periods
// at once (bucketed via $cond on date), then reshaped in JS to merge
// each tag's current/previous side -- a tag present in only one period
// needs the other side defaulted to 0, which is easier to express
// here than inside the pipeline itself.
const getTagTrends = async (id: string, period: TrendPeriod): Promise<TagTrendResult[]> => {
    const { currentStart, previousStart } = computeTrendPeriodBoundaries(period);

    const rows = await Note.aggregate<{
        _id: { name: string; bucket: 'current' | 'previous' };
        icon: string;
        count: number;
    }>([
        { $match: { userId: id, date: { $gte: previousStart } } },
        {
            $addFields: {
                bucket: {
                    $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'],
                },
            },
        },
        { $sort: { date: -1 } },
        { $unwind: '$tags' },
        {
            $group: {
                _id: { name: '$tags.name', bucket: '$bucket' },
                icon: { $first: '$tags.icon' },
                count: { $sum: 1 },
            },
        },
    ]);

    const byName = new Map<string, { icon: string; currentCount: number; previousCount: number }>();
    for (const row of rows) {
        const name = row._id.name;
        const existing = byName.get(name) ?? { icon: row.icon, currentCount: 0, previousCount: 0 };
        if (row._id.bucket === 'current') {
            existing.currentCount = row.count;
            existing.icon = row.icon;
        } else {
            existing.previousCount = row.count;
        }
        byName.set(name, existing);
    }

    const results: TagTrendResult[] = Array.from(byName.entries()).map(([name, v]) => {
        let direction: TagTrendResult['direction'];
        let percentChange: number | null;
        if (v.previousCount === 0 && v.currentCount === 0) {
            direction = 'flat';
            percentChange = 0;
        } else if (v.previousCount === 0) {
            direction = 'new';
            percentChange = null;
        } else if (v.currentCount === 0) {
            direction = 'dropped';
            percentChange = -100;
        } else {
            percentChange = ((v.currentCount - v.previousCount) / v.previousCount) * 100;
            direction = v.currentCount > v.previousCount ? 'up' : v.currentCount < v.previousCount ? 'down' : 'flat';
        }
        return {
            name,
            icon: v.icon,
            currentCount: v.currentCount,
            previousCount: v.previousCount,
            percentChange,
            direction,
        };
    });

    // Most active (by current period count) first -- a tag that only
    // existed in the previous period (now fully dropped) still matters
    // enough to show, just lower priority than anything still active.
    results.sort((a, b) => b.currentCount - a.currentCount || b.previousCount - a.previousCount);
    return results;
};

export type TimeSeriesGranularity = 'week' | 'month' | 'year';

export interface TagTimeSeriesResult {
    buckets: string[];
    granularity: TimeSeriesGranularity;
    // One entry per tag (top N most active over the window), each
    // holding a count aligned index-for-index with `buckets` above --
    // 0 for any bucket that tag simply had no notes in, not omitted.
    series: { name: string; icon: string; counts: number[] }[];
}

const TIME_SERIES_MAX_TAGS = 6;

// The Monday (as a Date) of the week containing the given date --
// Sunday belongs to the PRIOR Monday's week, not its own, matching
// the standard ISO-ish "week starts Monday" convention.
function getMondayOf(date: Date): Date {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - diff);
    return d;
}

// Trailing N buckets ending with the bucket containing `today`, for
// whichever granularity is requested. Computed explicitly here
// (verified separately against week/month/year boundary crossings)
// rather than trusting whatever buckets happen to appear in the
// aggregation's raw output, since a bucket with zero matching notes
// for a given tag won't produce a row at all.
export function getTrailingBuckets(
    granularity: TimeSeriesGranularity,
    count: number,
    today: Date = new Date()
): string[] {
    if (granularity === 'week') {
        const currentMonday = getMondayOf(today);
        const weeks: string[] = [];
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(currentMonday);
            d.setDate(d.getDate() - i * 7);
            weeks.push(toDateString(d));
        }
        return weeks;
    }
    if (granularity === 'year') {
        const years: string[] = [];
        for (let i = count - 1; i >= 0; i--) {
            years.push(String(today.getFullYear() - i));
        }
        return years;
    }
    const months: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
}

// The earliest real calendar date covered by the window -- used to
// scope the initial $match so the aggregation doesn't scan a user's
// entire history when only a recent slice is actually needed.
function getEarliestDateForWindow(granularity: TimeSeriesGranularity, buckets: string[]): string {
    const earliest = buckets[0];
    if (granularity === 'year') return `${earliest}-01-01`;
    if (granularity === 'month') return `${earliest}-01`;
    return earliest; // week buckets are already full 'YYYY-MM-DD' Monday dates
}

// Given a note's raw date string, returns which bucket it belongs to
// for the requested granularity. Week bucketing needs real date math
// (finding that date's Monday); month and year are simple string
// prefixes of the existing 'YYYY-MM-DD' field, needing no date math
// at all.
function bucketKeyForDate(granularity: TimeSeriesGranularity, dateStr: string): string {
    if (granularity === 'year') return dateStr.slice(0, 4);
    if (granularity === 'month') return dateStr.slice(0, 7);
    const [y, m, d] = dateStr.split('-').map(Number);
    return toDateString(getMondayOf(new Date(y, m - 1, d)));
}

// Note counts per tag, bucketed by the requested granularity over a
// trailing window of `bucketCount` buckets, for the top N most-active
// tags -- meant to answer "what does this tag's trend actually look
// like over time", not just a single before/after comparison.
// Bucketing itself happens in JS (via bucketKeyForDate) rather than in
// the aggregation pipeline, since week bucketing needs real date math
// that's much simpler and more directly testable as a plain function
// than as Mongo aggregation expressions.
const getTagTimeSeries = async (
    id: string,
    granularity: TimeSeriesGranularity,
    bucketCount: number
): Promise<TagTimeSeriesResult> => {
    const buckets = getTrailingBuckets(granularity, bucketCount);
    const earliestDate = getEarliestDateForWindow(granularity, buckets);

    const notes = await Note.find(
        { userId: id, date: { $gte: earliestDate } },
        { date: 1, tags: 1 }
    ).lean();

    const totalsByTag = new Map<string, { icon: string; total: number }>();
    const countsByTagAndBucket = new Map<string, Map<string, number>>();

    for (const note of notes) {
        const bucket = bucketKeyForDate(granularity, note.date);
        for (const tag of note.tags ?? []) {
            const totals = totalsByTag.get(tag.name) ?? { icon: tag.icon, total: 0 };
            totals.total += 1;
            totals.icon = tag.icon;
            totalsByTag.set(tag.name, totals);

            if (!countsByTagAndBucket.has(tag.name)) {
                countsByTagAndBucket.set(tag.name, new Map());
            }
            const bucketMap = countsByTagAndBucket.get(tag.name) as Map<string, number>;
            bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1);
        }
    }

    // Top N by total activity across the whole window -- a chart with
    // every tag ever used would be unreadable well before enough
    // history accumulates to fill out a long window.
    const topTagNames = Array.from(totalsByTag.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, TIME_SERIES_MAX_TAGS)
        .map(([name]) => name);

    const series = topTagNames.map((name) => {
        const bucketMap = countsByTagAndBucket.get(name);
        const icon = totalsByTag.get(name)?.icon ?? '🏷️';
        const counts = buckets.map((bucket) => bucketMap?.get(bucket) ?? 0);
        return { name, icon, counts };
    });

    return { buckets, granularity, series };
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
            $lt: end,
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
    getTagAnalytics,
    getTagTrends,
    getTagTimeSeries,
};