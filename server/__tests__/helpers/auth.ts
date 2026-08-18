import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// A middleware standing in for the real `checkJwt` (which calls out to
// Auth0's JWKS endpoint over the network — not something a unit/CI test
// should depend on). It reads a bearer token from the Authorization
// header and, if present, treats it as a raw Auth0 `sub` claim, mirroring
// exactly what express-oauth2-jwt-bearer would have already populated
// req.auth.payload.sub with by the time getVerifiedUserId() runs.
//
// checkJwt.ts's *own* logic (OPTIONS bypass, delegating to the real
// verifyJwt) is tested separately against the real module in
// checkJwt.test.ts — this helper exists purely so route-layer tests can
// exercise "what does this route do with a verified identity" without
// re-verifying a real JWT on every request.
export const fakeAuth = (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        const sub = header.slice('Bearer '.length);
        (req as unknown as { auth: { payload: { sub: string } } }).auth = {
            payload: { sub },
        };
    }
    next();
};

// Produces a valid-looking 24-char hex Mongo ObjectId string, matching
// what a real Auth0 `sub` looks like for this app once getVerifiedUserId
// strips the `auth0|` prefix (no padding needed).
export const validObjectId = (): string => new mongoose.Types.ObjectId().toHexString();

// Builds an `Authorization: Bearer auth0|<id>` header value for a given
// raw user id, the shape getVerifiedUserId expects from an
// Auth0-database-connection login.
export const bearerFor = (rawId: string): string => `Bearer auth0|${rawId}`;