import Redis from 'ioredis';
import { logger } from './logger';

// Deliberately short, matching the rate limiter's own reasoning: the
// whole point of caching is to make things faster, so a slow Redis
// must never make a request slower than not caching at all. If a
// round-trip takes longer than this, treat it as unavailable and fall
// straight through to the real computation.
const REDIS_TIMEOUT_MS = 300;

const FALLBACK_LOG_INTERVAL_MS = 60_000;
let lastFallbackLogAt = 0;

function logFallback(err: unknown): void {
    const now = Date.now();
    if (now - lastFallbackLogAt > FALLBACK_LOG_INTERVAL_MS) {
        lastFallbackLogAt = now;
        logger.warn({ err }, 'Cache operation failed -- continuing without caching for this request');
    }
}

const redisUrl = process.env.REDIS_URL;
// No REDIS_URL at all (e.g. local dev) means caching is a permanent,
// silent no-op rather than repeatedly trying and failing to connect to
// nothing -- every withCache() call just always takes the "compute it
// fresh" path.
const redis: Redis | null = redisUrl
    ? new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 500, 5000),
      })
    : null;

if (redis) {
    redis.on('error', (err) => logFallback(err));
} else {
    logger.warn('REDIS_URL not set -- analytics caching disabled, every request computes fresh');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Cache operation timed out')), ms)),
    ]);
}

/**
 * Returns a cached value for `key` if one exists and Redis is
 * reachable within the timeout; otherwise calls `compute()`, caches
 * the result for `ttlSeconds` (fire-and-forget -- the response is
 * never held up waiting for the cache WRITE to finish, only the read),
 * and returns it. A cache or Redis failure at any point falls straight
 * through to `compute()`, so this can never make a request fail or
 * hang that would otherwise have succeeded.
 */
export async function withCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    if (redis) {
        try {
            const cached = await withTimeout(redis.get(key), REDIS_TIMEOUT_MS);
            if (cached !== null) {
                logger.info({ key }, 'Cache hit');
                return JSON.parse(cached) as T;
            }
            logger.info({ key }, 'Cache miss');
        } catch (err) {
            logFallback(err);
        }
    }

    const result = await compute();

    if (redis) {
        // Fire-and-forget -- a slow or failed cache WRITE should never
        // delay the response, since the caller already has their
        // (freshly computed, correct) answer at this point regardless.
        withTimeout(redis.set(key, JSON.stringify(result), 'EX', ttlSeconds), REDIS_TIMEOUT_MS).catch((err) =>
            logFallback(err)
        );
    }

    return result;
}

/**
 * Invalidates every cached analytics key for a specific user -- meant
 * to be called whenever that user's notes change (create/update/
 * delete/upload), so a cache TTL is a backstop for the rare case
 * invalidation itself fails, not the primary mechanism keeping
 * analytics fresh after an edit. Uses SCAN rather than KEYS, since
 * KEYS blocks the whole Redis instance while it walks the entire
 * keyspace -- fine on a throwaway local Redis, a real production
 * concern on a shared instance.
 */
export async function invalidateUserAnalyticsCache(userId: string): Promise<void> {
    if (!redis) return;
    try {
        const pattern = `analytics:${userId}:*`;
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete: string[] = [];
        for await (const keys of stream) {
            keysToDelete.push(...(keys as string[]));
        }
        if (keysToDelete.length > 0) {
            await withTimeout(redis.del(...keysToDelete), REDIS_TIMEOUT_MS);
        }
    } catch (err) {
        // Invalidation failing isn't itself dangerous -- the TTL below
        // still bounds how stale the cache can get, worst case. Just
        // log it rather than let a cache-cleanup failure break a note
        // save/update/delete, which is the actual thing the user is
        // waiting on.
        logFallback(err);
    }
}

export async function shutdownCache(): Promise<void> {
    if (redis) {
        redis.disconnect();
    }
}
