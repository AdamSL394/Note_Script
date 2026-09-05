import { z } from 'zod';

// Matches the app's established 'YYYY-MM-DD' date convention (see
// types/index.ts on the client, and models/notes.ts's `date` field).
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date string');

// The only star values the client's <Select> ever sends (editingNote.tsx).
const starValue = z.enum(['None', '1', '2', '3']);

export const noteRangeSchema = z.object({
    start: dateString,
    end: dateString,
    sort: z.enum(['asc', 'desc']).optional(),
});

export const updateNoteSchema = z.object({
    edit: z.boolean(),
    // Capped at 200 to match the client's own Textarea character limit
    // (TextArea/index.tsx) — previously enforced only in the UI, not on
    // the server, so a non-UI client could send arbitrarily long text.
    text: z.string().max(200),
    date: dateString,
    star: starValue,
    look: z.boolean(),
    gym: z.boolean(),
    weed: z.boolean(),
    code: z.boolean(),
    read: z.boolean(),
    eatOut: z.boolean(),
    basketball: z.boolean(),
});

// postNotes' body is looser than updateNote's — the client only ever
// sends the tag fields that are actually toggled on (homeView.tsx's
// storeNewNote only adds a key when `stat.visible === 'visible'`), so
// every tag field here is optional. userId is deliberately NOT included
// here: the route always overwrites whatever the client sends with the
// verified token identity, after this schema validates the rest.
export const createNoteSchema = z.object({
    text: z.string().min(1).max(200),
    date: dateString,
    star: starValue.optional(),
    look: z.boolean().optional(),
    gym: z.boolean().optional(),
    weed: z.boolean().optional(),
    code: z.boolean().optional(),
    read: z.boolean().optional(),
    eatOut: z.boolean().optional(),
    basketball: z.boolean().optional(),
    king: z.boolean().optional(),
    medal: z.boolean().optional(),
    'date/smoosh': z.boolean().optional(),
});

export const uploadNotesSchema = z.object({
    note: z.string().min(1),
});

const userDetailsSchema = z.object({
    // Loose string rather than z.string().email() -- the goal here is
    // rejecting type-confusion (an object where a string is expected),
    // not policing RFC email format for a value Auth0 already owns.
    email: z.string().min(1),
});

export const getUserSchema = z.object({
    user: userDetailsSchema,
});

export const trackedStatsSchema = z.object({
    user: userDetailsSchema,
    trackedStats: z.object({
        icon: z.string().min(1),
        name: z.string().min(1),
        visible: z.enum(['visible', 'hidden']),
    }),
});
