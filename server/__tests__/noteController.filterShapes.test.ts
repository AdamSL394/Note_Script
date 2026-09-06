// Supplementary to noteController.ownership.test.ts (which runs against a
// real in-memory Mongo and is the suite that actually matters — it proves
// the queries *behave* correctly). This file mocks the Mongoose Model
// layer entirely and asserts the exact filter object each ownership-
// sensitive controller function sends to Mongoose. It exists because it
// has no external dependency (no mongod binary needed) and gives fast,
// hermetic proof that a future edit can't accidentally drop `userId` from
// a filter and have the real-DB test suite be the only thing that would
// catch it — this catches that class of regression even in environments
// (like this sandbox) that can't reach a real database.

jest.mock('../models/notes', () => ({
    __esModule: true,
    default: {
        deleteOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        find: jest.fn(),
        findById: jest.fn(),
        countDocuments: jest.fn(),
    },
}));

import Note from '../models/notes';
import noteController from '../controller/noteController';

const mockDeleteOne = Note.deleteOne as jest.Mock;
const mockFindOneAndUpdate = Note.findOneAndUpdate as jest.Mock;
const mockFind = Note.find as jest.Mock;
const mockCountDocuments = Note.countDocuments as jest.Mock;

const chainable = (result: unknown) => ({ exec: jest.fn().mockResolvedValue(result) });

describe('deleteNotes — filter shape sent to Mongoose', () => {
    it('scopes the delete by BOTH _id and userId, never _id alone', async () => {
        mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
        await noteController.deleteNotes('507f1f77bcf86cd799439011', 'user-a-id');

        expect(mockDeleteOne).toHaveBeenCalledWith({
            _id: '507f1f77bcf86cd799439011',
            userId: 'user-a-id',
        });
        // The regression this guards: Note.deleteOne({ _id: id }) alone
        // would let any authenticated user delete any note by _id.
        const calledFilter = mockDeleteOne.mock.calls[0][0];
        expect(Object.keys(calledFilter).sort()).toEqual(['_id', 'userId']);
    });
});

describe('updateNote — filter shape sent to Mongoose', () => {
    it('scopes the update by BOTH _id and userId via findOneAndUpdate, not findByIdAndUpdate', async () => {
        mockFindOneAndUpdate.mockResolvedValue({ text: 'updated' });
        await noteController.updateNote(
            '507f1f77bcf86cd799439011', 'user-a-id',
            { edit: true, text: 'text', date: '2026-01-01', star: '1', tags: [] },
        );

        const [filter] = mockFindOneAndUpdate.mock.calls[0];
        expect(filter).toEqual({ _id: '507f1f77bcf86cd799439011', userId: 'user-a-id' });
    });
});

describe('updateNote — backward-compat reconciliation between tags and legacy fields', () => {
    beforeEach(() => {
        mockFindOneAndUpdate.mockResolvedValue({ text: 'updated' });
    });

    it('new-format client: tags sent directly is used as-is', async () => {
        await noteController.updateNote('id1', 'user-a', {
            edit: false, text: 't', date: '2026-01-01', star: 'None',
            tags: [{ name: 'weed', icon: '🍁' }, { name: 'coffee', icon: '☕️' }],
        });
        const [, update] = mockFindOneAndUpdate.mock.calls[0];
        expect(update.$set.tags).toEqual([
            { name: 'weed', icon: '🍁' },
            { name: 'coffee', icon: '☕️' },
        ]);
    });

    it('old-format client: legacy boolean fields (no tags sent) get reconciled into tag snapshots', async () => {
        await noteController.updateNote('id1', 'user-a', {
            edit: false, text: 't', date: '2026-01-01', star: 'None',
            look: true, gym: false, weed: true, basketball: true,
        });
        const [, update] = mockFindOneAndUpdate.mock.calls[0];
        const names = update.$set.tags.map((t: { name: string }) => t.name).sort();
        expect(names).toEqual(['basketball', 'look', 'weed'].sort());
        // Confirms each reconciled entry is a real snapshot with a
        // known icon, not just a bare name -- the whole point of this
        // migration is that the icon travels with the note.
        expect(
            update.$set.tags.every((t: { icon: string }) => typeof t.icon === 'string' && t.icon.length > 0)
        ).toBe(true);
    });

    it('neither tags nor any legacy field sent: tags is left out of $set entirely, not wiped', async () => {
        await noteController.updateNote('id1', 'user-a', {
            edit: false, text: 'just changed the text', date: '2026-01-01', star: 'None',
        });
        const [, update] = mockFindOneAndUpdate.mock.calls[0];
        expect(update.$set).not.toHaveProperty('tags');
    });

    it('old-format client with every legacy field false: tags becomes an empty array, not left untouched', async () => {
        await noteController.updateNote('id1', 'user-a', {
            edit: false, text: 't', date: '2026-01-01', star: 'None',
            look: false, gym: false,
        });
        const [, update] = mockFindOneAndUpdate.mock.calls[0];
        expect(update.$set.tags).toEqual([]);
    });
});

describe('getSingleNote — filter shape sent to Mongoose', () => {
    it('scopes the read by BOTH _id and userId', async () => {
        mockFind.mockReturnValue(chainable([]));
        await noteController.getSingleNote('507f1f77bcf86cd799439011', 'user-a-id');

        expect(mockFind).toHaveBeenCalledWith({
            _id: '507f1f77bcf86cd799439011',
            userId: 'user-a-id',
        });
    });
});

describe('getAllNotes / getAllNotesOrdered / getRangeNotes / getMostRecentlyUpdatedNotes — always filter by the caller-supplied userId', () => {
    it('getAllNotes never omits userId from its filter', async () => {
        mockFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue([]),
                }),
            }),
        });
        mockCountDocuments.mockResolvedValue(0);
        await noteController.getAllNotes('507f1f77bcf86cd799439011', 1, 30);
        const [filter] = mockFind.mock.calls[0];
        expect(filter).toHaveProperty('userId');
    });

    it('getRangeNotes filters by userId in addition to the date range, inclusive of the end date', async () => {
        mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        await noteController.getRangeNotes('507f1f77bcf86cd799439011', '2026-01-01', '2026-02-01');
        const [filter] = mockFind.mock.calls[0];
        // $lte, not $lt -- a note dated exactly on the end boundary
        // (e.g. today, when Home's "last week" fetch passes today's
        // date as the end) must be included, not excluded. The
        // previous version of this test asserted $lt, which meant it
        // was encoding the actual bug as expected, passing behavior
        // rather than catching it.
        expect(filter).toMatchObject({
            date: { $gte: '2026-01-01', $lte: '2026-02-01' },
        });
        expect(filter).toHaveProperty('userId');
    });
});