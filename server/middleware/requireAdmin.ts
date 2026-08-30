import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/user';
import { getRequiredUserId } from './requireAuth';
import { logger } from '../logger';

// Must run after requireAuth in the middleware chain -- relies on
// req.verifiedUserId already being set. getRequiredUserId() throws a
// loud, specific error if it isn't, same misuse-guard as everywhere
// else that reads it.
//
// Deliberately checks the actual database record on every request
// rather than trusting anything client-supplied (a role claimed in a
// request body/header, for instance) -- role is the one field on this
// app's most sensitive endpoint, so it's worth the extra query rather
// than trusting anything that didn't come from a server-side lookup.
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = getRequiredUserId(req);
    try {
        const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) }).exec();
        if (!user || user.role !== 'admin') {
            // Same 403 regardless of whether the user doesn't exist at
            // all vs exists but isn't admin -- doesn't leak which case
            // it is.
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    } catch (err) {
        logger.error({ err, userId }, 'Failed to verify admin role');
        res.status(500).json({ error: 'Internal server error' });
    }
};
