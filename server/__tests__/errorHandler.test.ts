import { Request, Response } from 'express';
import { errorHandler } from '../middleware/errorHandler';

function createMockResponse() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe('errorHandler', () => {
    it('respects a 401 from .status -- the actual bug: this used to always return 500 regardless', () => {
        // This is exactly the shape express-oauth2-jwt-bearer raises for
        // a missing/invalid token -- a completely normal, expected
        // rejection, not a real server failure.
        const err = Object.assign(new Error('invalid_token'), { status: 401 });
        const res = createMockResponse();

        errorHandler(err, {} as Request, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'invalid_token' });
    });

    it('respects a status from .statusCode too, not just .status', () => {
        // Different code in this app (web-push's errors in
        // pushController.ts) uses this property name instead.
        const err = Object.assign(new Error('subscription gone'), { statusCode: 410 });
        const res = createMockResponse();

        errorHandler(err, {} as Request, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(410);
    });

    it('defaults to 500 with a generic message when the error has no status at all', () => {
        const err = new Error('something broke internally, includes a stack trace and internals');
        const res = createMockResponse();

        errorHandler(err, {} as Request, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        // The real internal message must never reach the client, even
        // though it's already logged server-side separately.
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('keeps the response message generic for a 5xx status, even with a specific message set', () => {
        const err = Object.assign(new Error('upstream service unavailable'), { status: 503 });
        const res = createMockResponse();

        errorHandler(err, {} as Request, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('ignores a bogus out-of-range status rather than trusting it blindly', () => {
        const err = Object.assign(new Error('weird'), { status: 999 });
        const res = createMockResponse();

        errorHandler(err, {} as Request, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
