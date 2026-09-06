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

// Mirrors constants/noteFields.ts's RESERVED_NOTE_FIELDS on the client
// -- kept in sync manually since this is a separate codebase, but this
// is now genuinely a defense-in-depth backstop rather than the primary
// protection: tags living in an array means a tag literally named
// "star" can no longer overwrite the real star field the way a flat
// boolean field could, regardless of whether this check is ever
// bypassed.
const RESERVED_TAG_NAMES = new Set([
    '_id', 'userId', 'text', 'date', 'star', 'edit', 'updatedAt', 'textLength', 'tags',
]);

const tagsArray = z
    .array(
        z.object({
            name: z.string().min(1).max(30),
            icon: z.string().min(1).max(16),
        })
    )
    .max(40)
    .refine(
        (tags) => tags.every((t) => !RESERVED_TAG_NAMES.has(t.name)),
        { message: 'A tag name conflicts with a reserved field name.' }
    );

// Legacy boolean fields, accepted as optional alongside `tags` so the
// currently-live client (which sends these on every edit and knows
// nothing about `tags`) keeps working during the gap between this
// backend deploy and the client actually being updated. See
// noteController.ts's updateNote for how these get reconciled into
// `tags` server-side when a request uses the old format. Deliberately
// does NOT include 'king', 'medal', or 'date/smoosh' -- the live
// client's edit flow has never sent those (only creation could set
// them), so there's nothing to bridge for those three specifically.
const legacyTagFields = {
    look: z.boolean().optional(),
    gym: z.boolean().optional(),
    weed: z.boolean().optional(),
    code: z.boolean().optional(),
    read: z.boolean().optional(),
    eatOut: z.boolean().optional(),
    basketball: z.boolean().optional(),
};

export const updateNoteSchema = z.object({
    edit: z.boolean(),
    // Capped at 200 to match the client's own Textarea character limit
    // (TextArea/index.tsx) — previously enforced only in the UI, not on
    // the server, so a non-UI client could send arbitrarily long text.
    text: z.string().max(200),
    date: dateString,
    star: starValue,
    tags: tagsArray.optional(),
    ...legacyTagFields,
});

// postNotes' body is looser than updateNote's — tags defaults to an
// empty array rather than being required, since a brand new note may
// not have any tags set yet. userId is deliberately NOT included
// here: the route always overwrites whatever the client sends with the
// verified token identity, after this schema validates the rest.
export const createNoteSchema = z.object({
    text: z.string().min(1).max(200),
    date: dateString,
    star: starValue.optional(),
    tags: tagsArray.optional(),
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
        icon: z.string().min(1).max(8),
        name: z
            .string()
            .min(1)
            .max(30)
            .refine((n) => !RESERVED_TAG_NAMES.has(n), {
                message: 'This name conflicts with a reserved field name -- please choose a different name.',
            }),
        visible: z.enum(['visible', 'hidden']),
    }),
});
