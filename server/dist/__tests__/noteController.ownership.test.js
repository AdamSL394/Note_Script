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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const testDb = __importStar(require("./helpers/db"));
const notes_1 = __importDefault(require("../models/notes"));
const noteController_1 = __importDefault(require("../controller/noteController"));
// These tests exist to catch exactly one bug class: an authenticated user
// (User A) reading, editing, or deleting data that belongs to a different
// user (User B) purely by knowing/guessing an _id. That was a real,
// previously-shipped vulnerability in this codebase (the server used to
// trust a client-submitted userId). Every test below creates two users'
// worth of notes in a real database and asserts the wall between them
// holds, no matter what id User A supplies.
const userA = new mongoose_1.default.Types.ObjectId().toHexString();
const userB = new mongoose_1.default.Types.ObjectId().toHexString();
beforeAll(async () => {
    await testDb.connect();
});
afterAll(async () => {
    await testDb.closeDatabase();
});
afterEach(async () => {
    await testDb.clearDatabase();
});
const seedNote = async (userId, overrides = {}) => {
    const note = new notes_1.default({
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
        const result = await noteController_1.default.getSingleNote(note._id.toString(), userA);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('seed note');
    });
    it("returns nothing when User A requests User B's note by its real _id", async () => {
        const bNote = await seedNote(userB, { text: "B's private note" });
        const result = await noteController_1.default.getSingleNote(bNote._id.toString(), userA);
        expect(result).toHaveLength(0);
    });
});
describe('deleteNotes — ownership scoping', () => {
    it("deletes a user's own note", async () => {
        const note = await seedNote(userA);
        const outcome = await noteController_1.default.deleteNotes(note._id.toString(), userA);
        expect(outcome).toBe('note deleted');
        expect(await notes_1.default.findById(note._id)).toBeNull();
    });
    it("refuses to delete User B's note when called with User A's id, and leaves it intact", async () => {
        const bNote = await seedNote(userB, { text: "B's note, do not touch" });
        const outcome = await noteController_1.default.deleteNotes(bNote._id.toString(), userA);
        expect(outcome).toBe('not found');
        const stillThere = await notes_1.default.findById(bNote._id);
        expect(stillThere).not.toBeNull();
        expect(stillThere?.text).toBe("B's note, do not touch");
    });
});
describe('updateNote — ownership scoping', () => {
    const args = (id, userId) => [id, userId, true, 'edited text', '2026-02-02', '3', false, false, false, false, false, false, false];
    it("updates a user's own note", async () => {
        const note = await seedNote(userA);
        const updated = await noteController_1.default.updateNote(...args(note._id.toString(), userA));
        expect(updated?.text).toBe('edited text');
    });
    it("returns null and does not mutate User B's note when called with User A's id", async () => {
        const bNote = await seedNote(userB, { text: 'original, unowned by A' });
        const updated = await noteController_1.default.updateNote(...args(bNote._id.toString(), userA));
        expect(updated).toBeNull();
        const stillThere = await notes_1.default.findById(bNote._id);
        expect(stillThere?.text).toBe('original, unowned by A');
    });
});
describe('getAllNotes / getAllNotesOrdered / getRangeNotes / getMostRecentlyUpdatedNotes — scoping', () => {
    it('never returns another user\'s notes mixed into the results', async () => {
        await seedNote(userA, { text: 'A note 1', date: '2026-01-01' });
        await seedNote(userA, { text: 'A note 2', date: '2026-01-05' });
        await seedNote(userB, { text: 'B note 1', date: '2026-01-03' });
        const all = await noteController_1.default.getAllNotes(userA);
        expect(all).toHaveLength(2);
        expect(all.every((n) => n.userId === userA)).toBe(true);
        const ordered = await noteController_1.default.getAllNotesOrdered(userA);
        expect(ordered).toHaveLength(2);
        expect(ordered.every((n) => n.userId === userA)).toBe(true);
        const recent = await noteController_1.default.getMostRecentlyUpdatedNotes(userA);
        expect(recent).toHaveLength(2);
        expect(recent.every((n) => n.userId === userA)).toBe(true);
        const ranged = await noteController_1.default.getRangeNotes(userA, '2026-01-01', '2026-01-31');
        expect(ranged).toHaveLength(2);
        expect(ranged.every((n) => n.userId === userA)).toBe(true);
    });
    it('returns an empty array (not an error) for a user with zero notes', async () => {
        await seedNote(userB);
        const result = await noteController_1.default.getAllNotes(userA);
        expect(result).toEqual([]);
    });
});
describe('getNoteCount — scoping', () => {
    it("counts only the requesting user's notes", async () => {
        await seedNote(userA, { text: 'A note 1', date: '2026-01-01' });
        await seedNote(userA, { text: 'A note 2', date: '2026-01-05' });
        await seedNote(userB, { text: 'B note 1', date: '2026-01-03' });
        expect(await noteController_1.default.getNoteCount(userA)).toBe(2);
        expect(await noteController_1.default.getNoteCount(userB)).toBe(1);
    });
    it('returns 0 (not an error) for a user with zero notes', async () => {
        await seedNote(userB);
        expect(await noteController_1.default.getNoteCount(userA)).toBe(0);
    });
});
describe('postNotes — userId handling', () => {
    it('saves the note under the exact userId it is given', async () => {
        const result = await noteController_1.default.postNotes({
            userId: userA,
            text: 'new note',
            date: '2026-03-01',
            star: 'None',
        });
        expect(result).toBe('Success');
        const saved = await notes_1.default.findOne({ userId: userA });
        expect(saved?.text).toBe('new note');
    });
    it('pads a non-24-char userId with "000" before saving (mirrors getVerifiedUserId)', async () => {
        const shortId = 'shortid123';
        await noteController_1.default.postNotes({
            userId: shortId,
            text: 'padded id note',
            date: '2026-03-02',
            star: 'None',
        });
        const saved = await notes_1.default.findOne({ text: 'padded id note' });
        expect(saved?.userId).toBe(shortId + '000');
        expect(saved?.userId).toHaveLength(13);
    });
    it('surfaces a real validation error instead of always reporting Success', async () => {
        // text/date are required per the schema — omitting them must
        // produce Mongoose's real validation-failure message, since
        // this return value is exactly what the client's error check
        // string-matches against.
        const result = await noteController_1.default.postNotes({
            userId: userA,
        });
        expect(result).toMatch(/validation failed/i);
        expect(result).not.toBe('Success');
    });
});
