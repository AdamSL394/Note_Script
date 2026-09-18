jest.mock('../models/contactSubmission', () => ({
    __esModule: true,
    default: {
        create: jest.fn(),
        find: jest.fn(),
    },
}));

jest.mock('../models/user', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

// Mocks the checkJwt MODULE itself, rather than applying fakeAuth as a
// separate wrapper at the test app's mount level -- contact.ts calls
// checkJwt directly inside its own GET /submissions route (since the
// router itself is deliberately mounted bare, so the public POST route
// stays public), and a test that bypasses that internal call entirely
// would never actually exercise it. That's exactly how the previous
// version of this test suite passed 7/7 despite GET /submissions being
// genuinely broken for every request in production: mounting fakeAuth
// outside the router meant the route's own (at the time, missing)
// auth setup was never exercised at all.
jest.mock('../middleware/checkJwt', () => ({
    __esModule: true,
    default: (
        req: import('express').Request,
        res: import('express').Response,
        next: import('express').NextFunction
    ) => {
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
            const sub = header.slice('Bearer '.length);
            (req as unknown as { auth: { payload: { sub: string } } }).auth = { payload: { sub } };
        }
        next();
    },
    // requireAuth.ts also imports this from the same module -- pure,
    // synchronous string logic with no network call to fake, so this
    // mirrors the real implementation exactly rather than needing any
    // actual mocking.
    getVerifiedUserId: (auth: { payload?: { sub?: string } } | undefined): string | undefined => {
        const sub = auth?.payload?.sub;
        if (!sub) return undefined;
        return sub.split('|')[1] ?? sub;
    },
}));

import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import { validObjectId } from './helpers/auth';
import contactRouter from '../routes/contact';
import ContactSubmission from '../models/contactSubmission';
import User from '../models/user';

const mockCreate = ContactSubmission.create as jest.Mock;
const mockFind = ContactSubmission.find as jest.Mock;
const mockUserFindOne = User.findOne as jest.Mock;

const buildApp = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/contact', contactRouter);
    return app;
};

describe('POST /contact/submit', () => {
    beforeEach(() => {
        mockCreate.mockReset();
        mockCreate.mockResolvedValue({});
    });

    it('accepts a valid submission and saves it, with no auth required', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/contact/submit')
            .send({ email: 'visitor@example.com', message: 'How do I export my notes?' });

        expect(res.status).toBe(201);
        expect(mockCreate).toHaveBeenCalledWith({
            email: 'visitor@example.com',
            message: 'How do I export my notes?',
        });
    });

    it('rejects an invalid email with 400 and never touches the database', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/contact/submit')
            .send({ email: 'not-an-email', message: 'hello' });

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects an empty message with 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/contact/submit')
            .send({ email: 'visitor@example.com', message: '' });

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects a message over the length limit with 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/contact/submit')
            .send({ email: 'visitor@example.com', message: 'x'.repeat(2001) });

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

describe('GET /contact/submissions', () => {
    const adminId = validObjectId();
    const regularUserId = validObjectId();

    beforeEach(() => {
        mockFind.mockReset();
        mockUserFindOne.mockReset();
    });

    it('returns submissions for an admin, newest first', async () => {
        mockUserFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ role: 'admin' }) });
        const submissions = [{ email: 'a@example.com', message: 'first' }];
        mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(submissions) });

        const app = buildApp();
        const res = await request(app)
            .get('/contact/submissions')
            .set('Authorization', `Bearer ${adminId}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(submissions);
    });

    it('rejects a non-admin user with 403', async () => {
        mockUserFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ role: 'user' }) });

        const app = buildApp();
        const res = await request(app)
            .get('/contact/submissions')
            .set('Authorization', `Bearer ${regularUserId}`);

        expect(res.status).toBe(403);
        expect(mockFind).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated request', async () => {
        const app = buildApp();
        const res = await request(app).get('/contact/submissions');

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(mockFind).not.toHaveBeenCalled();
    });
});
