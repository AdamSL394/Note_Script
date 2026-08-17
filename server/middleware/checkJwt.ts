import { auth, AuthResult } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';
import config from './../config/config.json'

const environment = (process.env.NODE_ENV || 'development') as keyof typeof config;

if (!config[environment]["auth0"]) {
    throw new Error(
        `Missing "auth0" config block for environment "${environment}" in config.json`
    );
}

const verifyJwt = auth({
    audience: config[environment]["auth0"]['audience'],
    issuerBaseURL: `https://${config[environment]["auth0"]['domain']}`,
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
    return rawId.length !== 24 ? rawId + '000' : rawId;
};

export default checkJwt;
