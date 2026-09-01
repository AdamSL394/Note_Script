import { rateLimit } from 'express-rate-limit';
import type { Request } from 'express';
import { HybridRateLimitStore } from './rateLimiter';
import { getVerifiedUserId } from './checkJwt';


const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const limit = Number(process.env.RATE_LIMIT_MAX) || 300;

export const rateLimitStore = new HybridRateLimitStore(process.env.REDIS_URL);

export const apiRateLimiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: rateLimitStore,
    keyGenerator: (req: Request): string => {
        const userId = getVerifiedUserId((req as unknown as { auth?: unknown }).auth as never);
        return userId ?? req.ip ?? 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later' });
    },
});
