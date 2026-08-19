import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import * as testDb from './helpers/db';
import { fakeAuth, bearerFor, validObjectId } from './helpers/auth';
import notesRouter from '../routes/notes';
import Note from '../models/notes';
import noteController from '../controller/noteController';

// These tests exercise the route layer with a real (in-memory) database
// and a stand-in for checkJwt (see helpers/auth.ts — the real middleware's
// own logic is covered separately in checkJwt.test.ts). The goal here is
// specifically the security property called out inline in routes/notes.ts:
// several routes deliberately ignore a client-supplied id in the URL or
// body in favor of the verified token identity. That's exactly the kind
// of thing that looks correct by inspection and breaks silently if
// someone "cleans up" a handler later.

const buildApp = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/notes', fakeAuth, notesRouter);
    return app;
};

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

describe('unauthenticated requests', () => {
    it.each([
        ['get', '/notes/all'],
        ['get', '/notes/note/507f1f77bcf86cd799439011'],
        ['delete', '/notes/delete/507f1f77bcf86cd799439011'],
        ['post', '/notes/note'],
    ])('%s %s returns 401 when no bearer token is present', async (method, url) => {
        const app = buildApp();
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
        expect(res.status).toBe(401);
    });
});

describe('POST /notes/note — userId override', () => {
    it("ignores a userId the client puts in the body and saves under the token's identity", async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/notes/note')
            .set('Authorization', bearerFor(userA))
            .send({ userId: userB, text: 'sneaky note', date: '2026-01-01', star: 'None' });

        expect(res.status).toBe(200);
        const saved = await Note.findOne({ text: 'sneaky note' });
        expect(saved?.userId).toBe(userA);
        expect(saved?.userId).not.toBe(userB);
    });
});

describe('GET /notes/note/:id — cross-user access', () => {
    it("returns an empty result when User A requests User B's note id", async () => {
        const bNote = await new Note({ userId: userB, text: 'B secret', date: '2026-01-01', star: 'None' }).save();
        const app = buildApp();
        const res = await request(app)
            .get(`/notes/note/${bNote._id.toString()}`)
            .set('Authorization', bearerFor(userA));

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it("returns the note when it belongs to the requesting user", async () => {
        const aNote = await new Note({ userId: userA, text: 'A note', date: '2026-01-01', star: 'None' }).save();
        const app = buildApp();
        const res = await request(app)
            .get(`/notes/note/${aNote._id.toString()}`)
            .set('Authorization', bearerFor(userA));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].text).toBe('A note');
    });
});

describe('DELETE /notes/delete/:id — cross-user deletion', () => {
    it("does not delete User B's note when User A calls delete with its id", async () => {
        const bNote = await new Note({ userId: userB, text: 'do not delete', date: '2026-01-01', star: 'None' }).save();
        const app = buildApp();
        await request(app)
            .delete(`/notes/delete/${bNote._id.toString()}`)
            .set('Authorization', bearerFor(userA));

        const stillThere = await Note.findById(bNote._id);
        expect(stillThere).not.toBeNull();
    });
});

describe('GET /notes/search/:id/:user — :user param is ignored', () => {
    it("passes the verified user's id to the controller, ignoring the :user path segment entirely", async () => {
        // $search (Atlas Search) isn't available against a plain local or
        // in-memory Mongo instance, and the /search route has no
        // try/catch around the controller call — so a real $search call
        // here doesn't fail fast, it hangs the request until Express's
        // unhandled-rejection behavior eventually kicks in. That's a
        // real gap in the route worth fixing separately, but it's not
        // what this test exists to check. Spying on the controller call
        // isolates exactly the property we care about — which userId the
        // route hands off — without needing a real search index.
        const spy = jest.spyOn(noteController, 'searchNotes').mockResolvedValue([]);
        const app = buildApp();
        const res = await request(app)
            .get(`/notes/search/findme/${userB}`)
            .set('Authorization', bearerFor(userA));

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalledWith('findme', userA);
        expect(spy).not.toHaveBeenCalledWith('findme', userB);
        spy.mockRestore();
    });
});

describe('GET /notes/lastyear/:userid/... — :userid param is ignored', () => {
    it("uses the verified identity, not the :userid in the URL", async () => {
        await new Note({ userId: userA, text: 'range note', date: '2026-06-15', star: 'None' }).save();
        const app = buildApp();
        // Route reads params as :userid/:tdYearAgo/:lwYearAgo, then calls
        // getRangeNotes(userId, lwYearAgo, tdYearAgo) — i.e. lwYearAgo is
        // treated as the *earlier* bound (start) and tdYearAgo as the
        // *later* bound (end). tdYearAgo goes first in the URL, so the
        // later date belongs in that first date slot.
        const res = await request(app)
            .get(`/notes/lastyear/${userB}/2026-12-31/2026-01-01`)
            .set('Authorization', bearerFor(userA));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].userId).toBe(userA);
    });
});

describe('GET /notes/recentlyUpdated/:id — :id param is ignored', () => {
    it("returns the verified user's recent notes regardless of the :id in the URL", async () => {
        await new Note({ userId: userA, text: 'recent', date: '2026-01-01', star: 'None' }).save();
        const app = buildApp();
        const res = await request(app)
            .get(`/notes/recentlyUpdated/${userB}`)
            .set('Authorization', bearerFor(userA));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].userId).toBe(userA);
    });
});

describe('PATCH /notes/update/:id — cross-user update', () => {
    it("does not modify User B's note when User A issues the update", async () => {
        const bNote = await new Note({ userId: userB, text: 'original', date: '2026-01-01', star: 'None' }).save();
        const app = buildApp();
        await request(app)
            .patch(`/notes/update/${bNote._id.toString()}`)
            .set('Authorization', bearerFor(userA))
            .send({
                edit: true, text: 'hijacked', date: '2026-01-01', star: '1',
                look: false, gym: false, weed: false, code: false, read: false, eatOut: false, basketball: false,
            });

        const stillThere = await Note.findById(bNote._id);
        expect(stillThere?.text).toBe('original');
    });
});

// Sanity check that validObjectId's shape matches what routes actually expect.
describe('helper sanity', () => {
    it('validObjectId produces a real 24-char hex string', () => {
        expect(validObjectId()).toMatch(/^[0-9a-f]{24}$/);
    });
});