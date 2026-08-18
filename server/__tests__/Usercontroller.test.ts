import mongoose from 'mongoose';
import * as testDb from './helpers/db';
import User from '../models/user';
import userController from '../controller/userController';

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

describe('getSingleUser', () => {
    it('returns the existing user without creating a duplicate', async () => {
        await new User({ _id: userA, email: 'a@example.com', settings: [] }).save();
        const result = await userController.getSingleUser(userA, { email: 'a@example.com' });
        expect(result).toHaveLength(1);
        expect(await User.countDocuments({ _id: userA })).toBe(1);
    });

    it('auto-provisions a new user on first login (empty find result)', async () => {
        const result = await userController.getSingleUser(userA, { email: 'new@example.com' });
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('new@example.com');
        const stored = await User.findById(userA);
        expect(stored).not.toBeNull();
    });

    it("never returns User B's record when looking up User A", async () => {
        await new User({ _id: userB, email: 'b@example.com', settings: [] }).save();
        const result = await userController.getSingleUser(userA, { email: 'a@example.com' });
        // Because User A didn't exist, this auto-provisions A rather than
        // ever surfacing B's document.
        expect(result).toHaveLength(1);
        expect(result[0]._id.toString()).toBe(userA);
    });
});

describe('updateUserStats', () => {
    it('adds a new tracked stat for a user with none yet', async () => {
        await new User({ _id: userA, email: 'a@example.com', settings: [] }).save();
        const stat = { icon: 'star', name: 'gym', visible: 'visible' as const };
        const updated = await userController.updateUserStats(userA, { email: 'a@example.com' }, stat);
        expect(updated?.settings).toHaveLength(1);
        expect(updated?.settings[0].name).toBe('gym');
    });

    it('removes a tracked stat when it already exists (toggle-off behavior)', async () => {
        const existing = { icon: 'star', name: 'gym', visible: 'visible' as const };
        await new User({ _id: userA, email: 'a@example.com', settings: [existing] }).save();
        const updated = await userController.updateUserStats(userA, { email: 'a@example.com' }, existing);
        expect(updated?.settings).toHaveLength(0);
    });

    it("only ever mutates the calling user's own settings, never another user's", async () => {
        await new User({ _id: userA, email: 'a@example.com', settings: [] }).save();
        await new User({
            _id: userB,
            email: 'b@example.com',
            settings: [{ icon: 'star', name: 'existing', visible: 'visible' }],
        }).save();

        await userController.updateUserStats(userA, { email: 'a@example.com' }, {
            icon: 'star',
            name: 'gym',
            visible: 'visible',
        });

        const bUnchanged = await User.findById(userB);
        expect(bUnchanged?.settings).toHaveLength(1);
        expect(bUnchanged?.settings[0].name).toBe('existing');
    });

    it('auto-provisions the user if updateUserStats is called before any prior login', async () => {
        const stat = { icon: 'star', name: 'first-ever-stat', visible: 'visible' as const };
        const updated = await userController.updateUserStats(userA, { email: 'brand-new@example.com' }, stat);
        expect(updated?.settings).toHaveLength(1);
        expect(await User.countDocuments({ _id: userA })).toBe(1);
    });
});