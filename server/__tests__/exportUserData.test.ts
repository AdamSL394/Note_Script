jest.mock('../models/user', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

jest.mock('../models/notes', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
}));

import User from '../models/user';
import Note from '../models/notes';
import userController from '../controller/userController';

const mockUserFindOne = User.findOne as jest.Mock;
const mockNoteFind = Note.find as jest.Mock;

const chainableLean = (result: unknown) => ({ lean: jest.fn().mockResolvedValue(result) });
const chainableSortLean = (result: unknown) => ({
    sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(result) }),
});

describe('exportUserData', () => {
    it('bundles account info and notes together, excluding internal/sensitive fields', async () => {
        mockUserFindOne.mockReturnValue(
            chainableLean({
                _id: '112890888052131625129000',
                email: 'adam@example.com',
                role: 'admin',
                settings: [{ name: 'gym', icon: '💪', visible: 'visible' }],
                notificationPreferences: { enabled: true, reminderHour: 20, timezoneOffsetMinutes: 300 },
            })
        );
        mockNoteFind.mockReturnValue(
            chainableSortLean([
                {
                    _id: '507f1f77bcf86cd799439011',
                    userId: '112890888052131625129000',
                    text: 'Went to the gym',
                    date: '2026-09-06',
                    star: '3',
                    tags: [{ name: 'gym', icon: '💪' }],
                    edit: false,
                    updatedAt: new Date('2026-09-06T12:00:00Z'),
                },
            ])
        );

        const result = await userController.exportUserData('112890888052131625129000');

        // Real content is present and correctly shaped.
        expect(result.account.email).toBe('adam@example.com');
        expect(result.account.settings).toEqual([{ name: 'gym', icon: '💪', visible: 'visible' }]);
        expect(result.notes).toHaveLength(1);
        expect(result.notes[0]).toEqual({
            text: 'Went to the gym',
            date: '2026-09-06',
            star: '3',
            tags: [{ name: 'gym', icon: '💪' }],
            edit: false,
            updatedAt: new Date('2026-09-06T12:00:00Z'),
        });

        // Internal/sensitive fields never make it into the export.
        expect(result).not.toHaveProperty('account._id');
        expect((result.account as unknown as { role?: string }).role).toBeUndefined();
        expect((result.notes[0] as unknown as { userId?: string }).userId).toBeUndefined();
        expect((result.notes[0] as unknown as { _id?: string })._id).toBeUndefined();
    });

    it('scopes the note lookup by userId', async () => {
        mockUserFindOne.mockReturnValue(chainableLean(null));
        mockNoteFind.mockReturnValue(chainableSortLean([]));

        await userController.exportUserData('a-realistic-non-hex-auth0-id-000');

        expect(mockNoteFind).toHaveBeenCalledWith({ userId: 'a-realistic-non-hex-auth0-id-000' });
    });

    it('handles a user with no notification preferences set without throwing', async () => {
        mockUserFindOne.mockReturnValue(
            chainableLean({ _id: 'another-realistic-id-here-000', email: 'test@example.com', settings: [] })
        );
        mockNoteFind.mockReturnValue(chainableSortLean([]));

        const result = await userController.exportUserData('another-realistic-id-here-000');

        expect(result.account.notificationPreferences).toBeUndefined();
        expect(result.notes).toEqual([]);
    });
});
