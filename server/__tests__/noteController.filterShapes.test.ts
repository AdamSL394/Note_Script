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
    },
}));

import Note from '../models/notes';
import noteController from '../controller/noteController';

const mockDeleteOne = Note.deleteOne as jest.Mock;
const mockFindOneAndUpdate = Note.findOneAndUpdate as jest.Mock;
const mockFind = Note.find as jest.Mock;

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
            true, 'text', '2026-01-01', '1',
            false, false, false, false, false, false, false,
        );

        const [filter] = mockFindOneAndUpdate.mock.calls[0];
        expect(filter).toEqual({ _id: '507f1f77bcf86cd799439011', userId: 'user-a-id' });
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
        mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        await noteController.getAllNotes('507f1f77bcf86cd799439011');
        const [filter] = mockFind.mock.calls[0];
        expect(filter).toHaveProperty('userId');
    });

    it('getRangeNotes filters by userId in addition to the date range', async () => {
        mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
        await noteController.getRangeNotes('507f1f77bcf86cd799439011', '2026-01-01', '2026-02-01');
        const [filter] = mockFind.mock.calls[0];
        expect(filter).toMatchObject({
            date: { $gte: '2026-01-01', $lt: '2026-02-01' },
        });
        expect(filter).toHaveProperty('userId');
    });
});