import { auth, AuthResult } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';

// Requires two things set in your .env, and an "API" (not an
// "Application") registered in the Auth0 Dashboard:
//   AUTH0_DOMAIN=dev-07j15n0p.us.auth0.com
//   AUTH0_AUDIENCE=<the Identifier value from your registered API>
//
// Without a registered API + audience, Auth0 issues opaque access
// tokens that can't be verified this way at all — this middleware will
// reject every request until that's set up.
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    throw new Error(
        'AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in the environment to verify tokens.'
    );
}

const verifyJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});

// Browser CORS preflight (OPTIONS) requests never carry custom headers
// like Authorization — that's the entire point of preflight, checking
// whether the real request would be allowed before sending it with its
// real headers. Running JWT verification on OPTIONS requests means they
// always fail, which can block the real request from ever being sent.
// This skips verification for OPTIONS only; every other method still
// goes through full verification.
const checkJwt = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    return verifyJwt(req, res, next);
};

// Helper to safely derive the trusted user ID from a request that's
// already passed through checkJwt. Auth0's `sub` claim looks like
// "auth0|<id>" or "google-oauth2|<id>" — this app has always used only
// the part after the pipe (see client's user.sub.split('|')[1], and the
// padId pattern in routes/notes.ts), padding it to 24 characters the
// same way, so IDs derived here match what's already stored in the
// database for existing users. This is the ONLY trustworthy source of
// "who is making this request" — never a client-submitted userId in the
// body/params/query.
export const getVerifiedUserId = (auth: AuthResult | undefined): string | undefined => {
    const sub = auth?.payload?.sub;
    if (!sub) return undefined;
    const rawId = sub.split('|')[1] ?? sub;
    return rawId.length !== 24 ? rawId + '000' : rawId;
};

export default checkJwt;
