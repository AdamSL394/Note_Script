import { Request, Response, NextFunction } from 'express';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import { getVerifiedUserId } from './checkJwt';

// Lets route handlers read req.verifiedUserId directly instead of each
// one separately deriving and null-checking it from the raw auth
// payload.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            verifiedUserId?: string;
        }
    }
}

// Every route in this app requires a verified identity. Previously each
// of ~15 route handlers repeated the same few lines to derive and check
// that identity, and each independently wrote `res.status(401).send(
// 'Unauthorized')` — correct, but a real duplication, and separately,
// plain text while every other error path in the app (validation
// failures from validateBody, 500s from errorHandler) returns
// structured JSON. This runs once, in one place, with one response
// shape, checkJwt (verifies the JWT itself) must run before this in
// every router.use() chain — this only reads what checkJwt already
// verified, it doesn't re-verify the token.
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const userId = getVerifiedUserId((req as unknown as { auth?: AuthResult }).auth);
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.verifiedUserId = userId;
    next();
};

// Thin, typed accessor for use inside route handlers. Throwing here
// (rather than silently falling back to a re-check, which would just
// reintroduce the duplication this middleware exists to remove) means
// a route accidentally wired without requireAuth fails loudly with a
// clear, actionable message — caught by errorHandler and logged with
// full context — instead of a confusing downstream crash from passing
// undefined into a Mongo query.
export const getRequiredUserId = (req: Request): string => {
    if (!req.verifiedUserId) {
        throw new Error(
            'getRequiredUserId() called on a route without requireAuth middleware'
        );
    }
    return req.verifiedUserId;
};
