import { rateLimit } from 'express-rate-limit';
import { HybridRateLimitStore } from './rateLimiter';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const limit = Number(process.env.RATE_LIMIT_MAX) || 100;

export const rateLimitStore = new HybridRateLimitStore(process.env.REDIS_URL);

export const apiRateLimiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: rateLimitStore,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later' });
    },
});
