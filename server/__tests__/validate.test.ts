import { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

function createMockResponse() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

const testSchema = z.object({
    text: z.string().min(1).max(200),
    count: z.number().optional(),
});

describe('validateBody', () => {
    it('passes a valid body through to the route handler unchanged', () => {
        const req = { body: { text: 'hello', count: 5 } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(testSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.body).toEqual({ text: 'hello', count: 5 });
    });

    it('rejects a body with the wrong type for a field, with a 400', () => {
        const req = { body: { text: 123 } } as unknown as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(testSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects the exact NoSQL-injection shape this middleware exists to stop', () => {
        // The actual scenario validate.ts's own comment describes: a
        // field typed as a string in TypeScript provides zero runtime
        // protection on its own -- a client can send a Mongo operator
        // object instead of a real string. This must still be rejected
        // after the zod major version bump, not silently accepted.
        const req = { body: { text: { $ne: null } } } as unknown as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(testSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('strips unrecognized fields from the body rather than passing them through', () => {
        // validate.ts's own comment claims this explicitly -- verifying
        // it's still actually true after the major version bump, not
        // just assumed from a comment written against the old version.
        const req = { body: { text: 'hello', unexpectedField: 'should be stripped' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(testSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ text: 'hello' });
        expect(req.body).not.toHaveProperty('unexpectedField');
    });

    it('includes a path and message for each validation failure in the response', () => {
        const req = { body: { text: '' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(testSchema)(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: 'Invalid request body',
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'text', message: expect.any(String) }),
                ]),
            })
        );
    });
});
