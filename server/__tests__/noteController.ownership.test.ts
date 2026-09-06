import mongoose from 'mongoose';
import * as testDb from './helpers/db';
import Note from '../models/notes';
import noteController from '../controller/noteController';

// These tests exist to catch exactly one bug class: an authenticated user
// (User A) reading, editing, or deleting data that belongs to a different
// user (User B) purely by knowing/guessing an _id. That was a real,
// previously-shipped vulnerability in this codebase (the server used to
// trust a client-submitted userId). Every test below creates two users'
// worth of notes in a real database and asserts the wall between them
// holds, no matter what id User A supplies.

const userA = new mongoose.Types.ObjectId().toHexString();
const userB = new mongoose.Types.ObjectId().toHexString();

beforeAll(async () => {
    await testDb.connect();
});

afterAll(async () => {
    await testDb.closeDatabase();
});

afterEach(async () => {
    await testDb.clearDatabase();
});

const seedNote = async (userId: string, overrides: Partial<Record<string, unknown>> = {}) => {
    const note = new Note({
        userId,
        text: 'seed note',
        date: '2026-01-01',
        star: 'None',
        ...overrides,
    });
    await note.save();
    return note;
};

describe('getSingleNote — ownership scoping', () => {
    it("returns a user's own note", async () => {
        const note = await seedNote(userA);
        const result = await noteController.getSingleNote(note._id.toString(), userA);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('seed note');
    });

    it("returns nothing when User A requests User B's note by its real _id", async () => {
        const bNote = await seedNote(userB, { text: "B's private note" });
        const result = await noteController.getSingleNote(bNote._id.toString(), userA);
        expect(result).toHaveLength(0);
    });
});

describe('deleteNotes — ownership scoping', () => {
    it("deletes a user's own note", async () => {
        const note = await seedNote(userA);
        const outcome = await noteController.deleteNotes(note._id.toString(), userA);
        expect(outcome).toBe('note deleted');
        expect(await Note.findById(note._id)).toBeNull();
    });

    it("refuses to delete User B's note when called with User A's id, and leaves it intact", async () => {
        const bNote = await seedNote(userB, { text: "B's note, do not touch" });
        const outcome = await noteController.deleteNotes(bNote._id.toString(), userA);
        expect(outcome).toBe('not found');
        const stillThere = await Note.findById(bNote._id);
        expect(stillThere).not.toBeNull();
        expect(stillThere?.text).toBe("B's note, do not touch");
    });
});

describe('updateNote — ownership scoping', () => {
    type TagSnapshot = { name: string; icon: string };
    const args = (id: string, userId: string) =>
        [
            id,
            userId,
            { edit: true, text: 'edited text', date: '2026-02-02', star: '3', tags: [] as TagSnapshot[] },
        ] as const;

    it("updates a user's own note", async () => {
        const note = await seedNote(userA);
        const updated = await noteController.updateNote(...args(note._id.toString(), userA));
        expect(updated?.text).toBe('edited text');
    });

    it("returns null and does not mutate User B's note when called with User A's id", async () => {
        const bNote = await seedNote(userB, { text: 'original, unowned by A' });
        const updated = await noteController.updateNote(...args(bNote._id.toString(), userA));
        expect(updated).toBeNull();
        const stillThere = await Note.findById(bNote._id);
        expect(stillThere?.text).toBe('original, unowned by A');
    });
});

describe('getAllNotes / getAllNotesOrdered / getRangeNotes / getMostRecentlyUpdatedNotes — scoping', () => {
    it('never returns another user\'s notes mixed into the results', async () => {
        await seedNote(userA, { text: 'A note 1', date: '2026-01-01' });
        await seedNote(userA, { text: 'A note 2', date: '2026-01-05' });
        await seedNote(userB, { text: 'B note 1', date: '2026-01-03' });

        const all = await noteController.getAllNotes(userA, 1, 30);
        expect(all.notes).toHaveLength(2);
        expect(all.totalCount).toBe(2);
        expect(all.notes.every((n) => n.userId === userA)).toBe(true);

        const ordered = await noteController.getAllNotesOrdered(userA);
        expect(ordered).toHaveLength(2);
        expect(ordered.every((n) => n.userId === userA)).toBe(true);

        const recent = await noteController.getMostRecentlyUpdatedNotes(userA);
        expect(recent).toHaveLength(2);
        expect(recent.every((n) => n.userId === userA)).toBe(true);

        const ranged = await noteController.getRangeNotes(userA, '2026-01-01', '2026-01-31');
        expect(ranged).toHaveLength(2);
        expect(ranged.every((n) => n.userId === userA)).toBe(true);
    });

    it('returns an empty array (not an error) for a user with zero notes', async () => {
        await seedNote(userB);
        const result = await noteController.getAllNotes(userA, 1, 30);
        expect(result.notes).toEqual([]);
        expect(result.totalCount).toBe(0);
    });
});

describe('getAllNotes — pagination', () => {
    it('skips (page-1)*pageSize documents and returns the real total count', async () => {
        await seedNote(userA, { text: 'note 1', date: '2026-01-01' });
        await seedNote(userA, { text: 'note 2', date: '2026-01-02' });
        await seedNote(userA, { text: 'note 3', date: '2026-01-03' });

        const pageOne = await noteController.getAllNotes(userA, 1, 2);
        expect(pageOne.notes).toHaveLength(2);
        expect(pageOne.totalCount).toBe(3);

        const pageTwo = await noteController.getAllNotes(userA, 2, 2);
        expect(pageTwo.notes).toHaveLength(1);
        expect(pageTwo.totalCount).toBe(3);

        // Page 1 and page 2 should never overlap.
        const pageOneIds = pageOne.notes.map((n) => n._id.toString());
        const pageTwoIds = pageTwo.notes.map((n) => n._id.toString());
        expect(pageOneIds).not.toEqual(expect.arrayContaining(pageTwoIds));
    });

    it('clamps an absurd pageSize instead of returning everything in one response', async () => {
        for (let i = 0; i < 5; i++) {
            await seedNote(userA, { text: `note ${i}`, date: `2026-01-0${i + 1}` });
        }
        const result = await noteController.getAllNotes(userA, 1, 999999);
        expect(result.notes.length).toBeLessThanOrEqual(100);
        expect(result.totalCount).toBe(5);
    });
});

describe('getNoteCount — scoping', () => {
    it("counts only the requesting user's notes", async () => {
        await seedNote(userA, { text: 'A note 1', date: '2026-01-01' });
        await seedNote(userA, { text: 'A note 2', date: '2026-01-05' });
        await seedNote(userB, { text: 'B note 1', date: '2026-01-03' });

        expect(await noteController.getNoteCount(userA)).toBe(2);
        expect(await noteController.getNoteCount(userB)).toBe(1);
    });

    it('returns 0 (not an error) for a user with zero notes', async () => {
        await seedNote(userB);
        expect(await noteController.getNoteCount(userA)).toBe(0);
    });
});

describe('postNotes — userId handling', () => {
    it('saves the note under the exact userId it is given', async () => {
        const result = await noteController.postNotes({
            userId: userA,
            text: 'new note',
            date: '2026-03-01',
            star: 'None',
        });
        expect(result).toBe('Success');
        const saved = await Note.findOne({ userId: userA });
        expect(saved?.text).toBe('new note');
    });

    it('pads a non-24-char userId with "000" before saving (mirrors getVerifiedUserId)', async () => {
        const shortId = 'shortid123';
        await noteController.postNotes({
            userId: shortId,
            text: 'padded id note',
            date: '2026-03-02',
            star: 'None',
        });
        const saved = await Note.findOne({ text: 'padded id note' });
        expect(saved?.userId).toBe(shortId + '000');
        expect(saved?.userId).toHaveLength(13);
    });

    it('surfaces a real validation error instead of always reporting Success', async () => {
        // text/date are required per the schema — omitting them must
        // produce Mongoose's real validation-failure message, since
        // this return value is exactly what the client's error check
        // string-matches against.
        const result = await noteController.postNotes({
            userId: userA,
        } as never);
        expect(result).toMatch(/validation failed/i);
        expect(result).not.toBe('Success');
    });
});