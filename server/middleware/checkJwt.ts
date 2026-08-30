import { auth, AuthResult } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';
import config from './../config/config.json'
import { normalizeUserId } from '../utils/userId';

const environment = (process.env.NODE_ENV || 'development') as keyof typeof config;
const environmentCreds = config[environment];

// Env vars take priority, matching validateEnv.ts's resolveMongoUri()
// pattern -- this is what an actual production deploy should use
// (Heroku config vars set these directly), not config.json, which is
// gitignored and never committed. Previously this file only ever read
// config.json, meaning Auth0 credentials had no way to reach a
// container built anywhere other than a machine that happened to
// already have a real local config.json sitting on disk -- a fresh CI
// checkout has nothing to read at all.
const domain = process.env.AUTH0_DOMAIN || environmentCreds?.auth0?.domain;
const audience = process.env.AUTH0_AUDIENCE || environmentCreds?.auth0?.audience;

if (!domain || !audience) {
    throw new Error(
        `Missing Auth0 configuration for environment "${String(environment)}". Set ` +
        'AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables, or add an "auth0" ' +
        `block to config.json's "${String(environment)}" section.`
    );
}

const verifyJwt = auth({
    audience,
    issuerBaseURL: `https://${domain}`,
});

const checkJwt = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    return verifyJwt(req, res, next);
};

export const getVerifiedUserId = (auth: AuthResult | undefined): string | undefined => {
    const sub = auth?.payload?.sub;
    if (!sub) return undefined;
    const rawId = sub.split('|')[1] ?? sub;
    return normalizeUserId(rawId);
};

export default checkJwt;
