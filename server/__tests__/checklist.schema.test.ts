import { Request, Response } from 'express';
import { validateBody } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas';

function createMockResponse() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe('createNoteSchema -- checklist', () => {
    it('accepts a normal text note with no checklist at all', () => {
        const req = { body: { text: 'Went for a run', date: '2026-01-01' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('accepts a checklist-only note (empty text)', () => {
        const req = {
            body: {
                text: '',
                date: '2026-01-01',
                checklist: [{ text: 'Buy milk', checked: false }],
            },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects a note with neither text nor any checklist item', () => {
        const req = { body: { text: '', date: '2026-01-01', checklist: [] } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a note with only whitespace text and no checklist items', () => {
        const req = { body: { text: '   ', date: '2026-01-01' } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a checklist item with empty text', () => {
        const req = {
            body: {
                text: '',
                date: '2026-01-01',
                checklist: [{ text: '', checked: false }],
            },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects more than 40 checklist items', () => {
        const checklist = Array.from({ length: 41 }, (_, i) => ({
            text: `item ${i}`,
            checked: false,
        }));
        const req = { body: { text: '', date: '2026-01-01', checklist } } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(createNoteSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('updateNoteSchema -- checklist', () => {
    it('accepts toggling a checklist item checked', () => {
        const req = {
            body: {
                edit: false,
                text: 'Some text',
                date: '2026-01-01',
                star: 'None',
                checklist: [{ text: 'Buy milk', checked: true }],
            },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(updateNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('accepts an update with checklist omitted entirely', () => {
        const req = {
            body: { edit: false, text: 'Some text', date: '2026-01-01', star: 'None' },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(updateNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('accepts emptying the checklist array', () => {
        const req = {
            body: {
                edit: false,
                text: 'Some text',
                date: '2026-01-01',
                star: 'None',
                checklist: [],
            },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(updateNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('accepts editing a checklist item’s text', () => {
        const req = {
            body: {
                edit: false,
                text: 'Some text',
                date: '2026-01-01',
                star: 'None',
                checklist: [{ text: 'Buy oat milk', checked: false }],
            },
        } as Request;
        const res = createMockResponse();
        const next = jest.fn();

        validateBody(updateNoteSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
