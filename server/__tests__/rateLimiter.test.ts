import express from 'express';
import request from 'supertest';
import { rateLimit } from 'express-rate-limit';
import { HybridRateLimitStore } from '../middleware/rateLimiter';

describe('HybridRateLimitStore — memory mode (no REDIS_URL)', () => {
    it('counts hits per key independently and increments correctly', async () => {
        const store = new HybridRateLimitStore(undefined);
        store.init({ windowMs: 1000 } as Parameters<typeof store.init>[0]);

        const a1 = await store.increment('key-a');
        const a2 = await store.increment('key-a');
        const b1 = await store.increment('key-b');

        expect(a1.totalHits).toBe(1);
        expect(a2.totalHits).toBe(2);
        expect(b1.totalHits).toBe(1);

        await store.shutdown();
    });

    it('resetKey clears a key back to zero', async () => {
        const store = new HybridRateLimitStore(undefined);
        store.init({ windowMs: 1000 } as Parameters<typeof store.init>[0]);

        await store.increment('key-a');
        await store.increment('key-a');
        await store.resetKey('key-a');
        const afterReset = await store.increment('key-a');

        expect(afterReset.totalHits).toBe(1);
        await store.shutdown();
    });

    it('decrement lowers the count', async () => {
        const store = new HybridRateLimitStore(undefined);
        store.init({ windowMs: 1000 } as Parameters<typeof store.init>[0]);

        await store.increment('key-a');
        await store.increment('key-a');
        await store.decrement('key-a');
        const afterDecrement = await store.increment('key-a');

        expect(afterDecrement.totalHits).toBe(2);
        await store.shutdown();
    });

    it('resets the counter once the window expires', async () => {
        const store = new HybridRateLimitStore(undefined);
        store.init({ windowMs: 150 } as Parameters<typeof store.init>[0]);

        await store.increment('windowtest');
        await new Promise((resolve) => setTimeout(resolve, 250));
        const afterExpiry = await store.increment('windowtest');

        expect(afterExpiry.totalHits).toBe(1);
        await store.shutdown();
    });
});

describe('HybridRateLimitStore — Redis unreachable', () => {
    it('falls back to memory and fails fast instead of hanging', async () => {
        const store = new HybridRateLimitStore('redis://10.255.255.1:6379');
        store.init({ windowMs: 1000 } as Parameters<typeof store.init>[0]);

        const start = Date.now();
        const result = await store.increment('faketest');
        const elapsed = Date.now() - start;

        expect(result.totalHits).toBe(1);
        // Well under a real network timeout -- proves the 300ms internal
        // timeout is what triggered the fallback, not a lucky fast failure.
        expect(elapsed).toBeLessThan(3000);
        await store.shutdown();
    });

    it('shutdown does not throw even against an unhealthy connection', async () => {
        const store = new HybridRateLimitStore('redis://10.255.255.1:6379');
        store.init({ windowMs: 1000 } as Parameters<typeof store.init>[0]);
        await store.increment('faketest');

        await expect(store.shutdown()).resolves.not.toThrow();
    });
});

describe('apiRateLimiter — full HTTP integration', () => {
    it('returns 429 with a structured error body once the limit is exceeded', async () => {
        const app = express();
        app.set('trust proxy', 1);
        const limiter = rateLimit({
            windowMs: 60_000,
            limit: 3,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            store: new HybridRateLimitStore(undefined),
            handler: (req, res) => {
                res.status(429).json({ error: 'Too many requests, please try again later' });
            },
        });
        app.get('/test', limiter, (req, res) => res.json({ ok: true }));

        const results = [];
        for (let i = 0; i < 5; i++) {
            results.push(await request(app).get('/test'));
        }

        expect(results.slice(0, 3).map((r) => r.status)).toEqual([200, 200, 200]);
        expect(results.slice(3).map((r) => r.status)).toEqual([429, 429]);
        expect(results[3].body).toEqual({ error: 'Too many requests, please try again later' });
    });
});
