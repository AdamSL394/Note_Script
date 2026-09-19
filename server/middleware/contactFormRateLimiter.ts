import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { HybridRateLimitStore } from './rateLimiter';

const windowMs = 15 * 60 * 1000;
// 5 submissions per IP per 15 minutes -- generous for a real person
// contacting support, tight enough that a spam script gains very
// little by hammering this endpoint.
const limit = 5;

export const contactFormRateLimiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new HybridRateLimitStore(process.env.REDIS_URL),
    // Keyed by IP, not user -- this endpoint has no authenticated
    // identity at all. Routed through ipKeyGenerator so a raw IPv6
    // address's multiple valid textual representations can't be used
    // to bypass the limit, same reasoning as apiRateLimiter.
    keyGenerator: (req: Request): string => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later' });
    },
});
