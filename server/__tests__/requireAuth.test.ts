import { Request, Response, NextFunction } from 'express';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';

const buildRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('requireAuth', () => {
    it('calls next() and sets req.verifiedUserId when a valid identity is present', () => {
        const req = {
            auth: { payload: { sub: 'auth0|507f1f77bcf86cd799439011' } },
        } as unknown as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.verifiedUserId).toBe('507f1f77bcf86cd799439011');
        expect(res.status).not.toHaveBeenCalled();
    });

    it('responds 401 with a structured JSON body (not plain text) when no identity is present', () => {
        const req = {} as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('responds 401 when auth exists but payload.sub is missing', () => {
        const req = { auth: { payload: {} } } as unknown as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('getRequiredUserId', () => {
    it('returns req.verifiedUserId when set', () => {
        const req = { verifiedUserId: 'abc123' } as Request;
        expect(getRequiredUserId(req)).toBe('abc123');
    });

    it('throws a clear, actionable error when called on a route without requireAuth', () => {
        // This is the misuse-guard, not a client-facing failure mode —
        // it should only ever fire if a route is wired without
        // requireAuth in its middleware chain, which is a bug to fix at
        // the route-declaration level. Throwing here (rather than
        // silently falling back to undefined) makes that bug loud and
        // immediately traceable instead of surfacing as a confusing
        // downstream Mongo error.
        const req = {} as Request;
        expect(() => getRequiredUserId(req)).toThrow(
            'getRequiredUserId() called on a route without requireAuth middleware'
        );
    });
});
