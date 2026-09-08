import mongoose from 'mongoose';
import * as testDb from './helpers/db';
import PushSubscription from '../models/pushSubscription';
import * as pushController from '../controller/pushController';

// These tests exist to catch exactly one bug class: an authenticated user
// (User A) reading, modifying, or deleting data that belongs to a
// different user (User B) purely by knowing/supplying an identifier --
// here, a push subscription's endpoint. This was a real gap found during
// a full cross-user authorization audit: removeSubscription previously
// deleted by endpoint alone, with no check it actually belonged to the
// requester. Real (ephemeral) MongoDB rather than mocked Mongoose
// models, on purpose -- a mocked model would happily return whatever we
// told it to and never notice the *filter* itself was wrong, same
// reasoning as the note ownership suite this file mirrors.

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

const seedSubscription = async (userId: string, endpoint: string) => {
    await PushSubscription.create({
        userId,
        endpoint,
        keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' },
    });
};

describe('removeSubscription — ownership scoping', () => {
    it("deletes a user's own subscription", async () => {
        await seedSubscription(userA, 'https://push.example.com/a-endpoint');
        await pushController.removeSubscription(userA, 'https://push.example.com/a-endpoint');

        const remaining = await PushSubscription.findOne({ endpoint: 'https://push.example.com/a-endpoint' });
        expect(remaining).toBeNull();
    });

    it("does NOT delete User B's subscription when User A supplies its real endpoint", async () => {
        await seedSubscription(userB, 'https://push.example.com/b-endpoint');

        await pushController.removeSubscription(userA, 'https://push.example.com/b-endpoint');

        // The subscription must still exist -- User A has no ownership
        // over it, regardless of knowing its exact endpoint.
        const stillThere = await PushSubscription.findOne({ endpoint: 'https://push.example.com/b-endpoint' });
        expect(stillThere).not.toBeNull();
        expect(stillThere?.userId).toBe(userB);
    });

    it('is a no-op when the endpoint does not exist at all', async () => {
        await expect(
            pushController.removeSubscription(userA, 'https://push.example.com/nonexistent')
        ).resolves.not.toThrow();
    });
});
