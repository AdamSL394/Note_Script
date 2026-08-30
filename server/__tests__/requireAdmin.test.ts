jest.mock('../models/user', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

import { Request, Response, NextFunction } from 'express';
import User from '../models/user';
import { requireAdmin } from '../middleware/requireAdmin';

const mockFindOne = User.findOne as jest.Mock;

const buildRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('requireAdmin', () => {
    afterEach(() => jest.clearAllMocks());

    it('calls next() when the user has role admin', async () => {
        mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ role: 'admin' }) });
        const req = { verifiedUserId: '507f1f77bcf86cd799439011' } as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        await requireAdmin(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when the user exists but is not admin', async () => {
        mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ role: 'user' }) });
        const req = { verifiedUserId: '507f1f77bcf86cd799439011' } as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('returns 403, not 404, when the user record does not exist -- does not leak which case it is', async () => {
        mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
        const req = { verifiedUserId: '507f1f77bcf86cd799439011' } as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects with the misuse-guard error if called without requireAuth having run first', async () => {
        const req = {} as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        await expect(requireAdmin(req, res, next)).rejects.toThrow(
            'getRequiredUserId() called on a route without requireAuth middleware'
        );
    });

    it('returns 500 (not a hang or an uncaught rejection) if the database lookup itself fails', async () => {
        mockFindOne.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('connection lost')) });
        const req = { verifiedUserId: '507f1f77bcf86cd799439011' } as Request;
        const res = buildRes();
        const next = jest.fn() as NextFunction;

        await requireAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
