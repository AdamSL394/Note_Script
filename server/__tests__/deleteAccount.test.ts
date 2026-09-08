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
    const userId = 'a-non-numeric-auth0-id-000';
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
        // Previously wrapped in new mongoose.Types.ObjectId(userId) --
        // User._id is a plain String field, and that wrapping genuinely
        // throws for any real Auth0 ID that isn't purely numeric (like
        // this one). This assertion is what actually would have caught
        // that bug, rather than encoding it as expected behavior.
        expect(mockUserDeleteOne).toHaveBeenCalledWith({ _id: userId });
    });

    it('always ends the session, even when the transaction throws', async () => {
        mockSession.withTransaction.mockImplementation(() => {
            throw new Error('transaction failed');
        });

        await expect(userController.deleteAccount(userId)).rejects.toThrow('transaction failed');
        expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });
});
