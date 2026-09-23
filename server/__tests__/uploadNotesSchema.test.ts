import { Request, Response } from 'express';
import { validateBody } from '../middleware/validate';
import { uploadNotesSchema } from '../validation/schemas';

function createMockResponse() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe('uploadNotesSchema', () => {
    it('accepts a normal-sized upload', () => {
        const req = { body: { note: '11/19/21\nWent for a run\n\n11/20/21\nCleaned the apartment' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(uploadNotesSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects an empty upload', () => {
        const req = { body: { note: '' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(uploadNotesSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts an upload right at the 50,000 character limit', () => {
        const req = { body: { note: 'x'.repeat(50000) } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(uploadNotesSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects an upload one character over the limit', () => {
        const req = { body: { note: 'x'.repeat(50001) } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(uploadNotesSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a genuinely large upload well past the limit', () => {
        const req = { body: { note: 'x'.repeat(500000) } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(uploadNotesSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
