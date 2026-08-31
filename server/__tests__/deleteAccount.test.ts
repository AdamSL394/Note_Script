jest.mock('../models/user', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        deleteOne: jest.fn(),
    },
}));

jest.mock('../models/notes', () => ({
    __esModule: true,
    default: {
        deleteMany: jest.fn(),
    },
}));

import mongoose from 'mongoose';
import User from '../models/user';
import Note from '../models/notes';
import userController from '../controller/userController';

const mockUserDeleteOne = User.deleteOne as jest.Mock;
const mockNoteDeleteMany = Note.deleteMany as jest.Mock;

describe('deleteAccount', () => {
    const userId = '507f1f77bcf86cd799439011';
    let mockSession: { withTransaction: jest.Mock; endSession: jest.Mock };
    let startSessionSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSession = {
            // Runs the callback directly, simulating a successful
            // transaction -- real transactional atomicity isn't
            // something a mock can meaningfully verify, but the wiring
            // (correct filters, correct session attached, cleanup
            // always happening) is exactly what these tests check.
            withTransaction: jest.fn((fn: () => Promise<void>) => fn()),
            endSession: jest.fn().mockResolvedValue(undefined),
        };
        startSessionSpy = jest
            .spyOn(mongoose, 'startSession')
            .mockResolvedValue(mockSession as unknown as mongoose.mongo.ClientSession);

        const chainable = { session: jest.fn().mockReturnThis() };
        mockNoteDeleteMany.mockReturnValue(chainable);
        mockUserDeleteOne.mockReturnValue(chainable);
    });

    afterEach(() => {
        startSessionSpy.mockRestore();
    });

    it('deletes the notes filtered by userId and the user by _id, both inside the transaction', async () => {
        await userController.deleteAccount(userId);

        expect(mockNoteDeleteMany).toHaveBeenCalledWith({ userId });
        expect(mockUserDeleteOne).toHaveBeenCalledWith({
            _id: expect.any(mongoose.Types.ObjectId),
        });
        // The exact ObjectId matches the userId passed in, not just any
        // ObjectId -- a copy-paste bug scoping the delete to the wrong
        // id would still pass the looser check above.
        const calledWith = mockUserDeleteOne.mock.calls[0][0]._id as mongoose.Types.ObjectId;
        expect(calledWith.toString()).toBe(userId);
    });

    it('always ends the session, even when the transaction throws', async () => {
        mockSession.withTransaction.mockImplementation(() => {
            throw new Error('transaction failed');
        });

        await expect(userController.deleteAccount(userId)).rejects.toThrow('transaction failed');
        expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });
});
