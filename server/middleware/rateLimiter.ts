import Redis from 'ioredis';
import type { Store, IncrementResponse, Options } from 'express-rate-limit';
import { logger } from '../logger';

// How long we're willing to wait on a single Redis round-trip before
// giving up and falling back to the in-memory counter for that request.
// Deliberately short — the whole point of the fallback is to never let
// a slow/unreachable Redis add real latency to a request.
const REDIS_TIMEOUT_MS = 300;

// Don't log a fallback warning on every single request during a
// sustained Redis outage — that would flood the logs. Log once, then
// stay quiet for this long before logging again.
const FALLBACK_LOG_INTERVAL_MS = 60_000;

// How often to sweep expired entries out of the in-memory fallback map,
// so a long Redis outage with many distinct keys (IPs) doesn't grow
// this unboundedly.
const MEMORY_SWEEP_INTERVAL_MS = 60_000;

interface MemoryEntry {
    count: number;
    resetTime: number;
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Redis operation timed out')), ms)
        ),
    ]);
};

export class HybridRateLimitStore implements Store {
    private redis: Redis | null;
    private windowMs = 15 * 60 * 1000;
    private memoryHits = new Map<string, MemoryEntry>();
    private lastFallbackLogAt = 0;
    private sweepTimer: ReturnType<typeof setInterval>;

    constructor(redisUrl: string | undefined) {
        // No REDIS_URL at all (e.g. local dev without Redis configured)
        // means never attempt a connection in the first place, rather
        // than repeatedly trying and failing to connect to nothing.
        this.redis = redisUrl
            ? new Redis(redisUrl, {
                  // Don't let ioredis's own automatic reconnection
                  // attempts queue up commands indefinitely while
                  // disconnected — fail fast so we fall back quickly
                  // instead of hanging.
                  maxRetriesPerRequest: 1,
                  retryStrategy: (times) => Math.min(times * 500, 5000),
              })
            : null;

        if (this.redis) {
            this.redis.on('error', (err) => {
                this.logFallback(err);
            });
        } else {
            logger.warn('REDIS_URL not set — rate limiting running in-memory only');
        }

        this.sweepTimer = setInterval(() => this.sweepExpiredMemoryEntries(), MEMORY_SWEEP_INTERVAL_MS);
        this.sweepTimer.unref();
    }

    init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    private logFallback(err: unknown): void {
        const now = Date.now();
        if (now - this.lastFallbackLogAt > FALLBACK_LOG_INTERVAL_MS) {
            this.lastFallbackLogAt = now;
            logger.warn({ err }, 'Rate limiter falling back to in-memory store — Redis unavailable');
        }
    }

    private sweepExpiredMemoryEntries(): void {
        const now = Date.now();
        for (const [key, entry] of this.memoryHits) {
            if (entry.resetTime <= now) {
                this.memoryHits.delete(key);
            }
        }
    }

    private memoryIncrement(key: string): IncrementResponse {
        const now = Date.now();
        const existing = this.memoryHits.get(key);
        if (!existing || existing.resetTime <= now) {
            const resetTime = now + this.windowMs;
            this.memoryHits.set(key, { count: 1, resetTime });
            return { totalHits: 1, resetTime: new Date(resetTime) };
        }
        existing.count += 1;
        return { totalHits: existing.count, resetTime: new Date(existing.resetTime) };
    }

    private async redisIncrement(key: string): Promise<IncrementResponse> {
        if (!this.redis) {
            throw new Error('Redis client not configured');
        }
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.pttl(key);
        const results = await withTimeout(pipeline.exec(), REDIS_TIMEOUT_MS);
        if (!results) {
            throw new Error('Redis pipeline returned no results');
        }
        const [[incrErr, count], [pttlErr, ttl]] = results;
        if (incrErr) throw incrErr;
        if (pttlErr) throw pttlErr;

        let resetInMs = ttl as number;
        // -1 means the key has no expiry yet — this is the first hit in
        // a new window, so set one now.
        if (resetInMs < 0) {
            await withTimeout(this.redis.pexpire(key, this.windowMs), REDIS_TIMEOUT_MS);
            resetInMs = this.windowMs;
        }

        return {
            totalHits: count as number,
            resetTime: new Date(Date.now() + resetInMs),
        };
    }

    async increment(key: string): Promise<IncrementResponse> {
        if (!this.redis) {
            return this.memoryIncrement(key);
        }
        try {
            return await this.redisIncrement(key);
        } catch (err) {
            this.logFallback(err);
            return this.memoryIncrement(key);
        }
    }

    async decrement(key: string): Promise<void> {
        if (this.redis) {
            try {
                await withTimeout(this.redis.decr(key), REDIS_TIMEOUT_MS);
                return;
            } catch (err) {
                this.logFallback(err);
            }
        }
        const existing = this.memoryHits.get(key);
        if (existing && existing.count > 0) {
            existing.count -= 1;
        }
    }

    async resetKey(key: string): Promise<void> {
        if (this.redis) {
            try {
                await withTimeout(this.redis.del(key), REDIS_TIMEOUT_MS);
            } catch (err) {
                this.logFallback(err);
            }
        }
        this.memoryHits.delete(key);
    }

    async shutdown(): Promise<void> {
        clearInterval(this.sweepTimer);
        if (this.redis) {
            // disconnect(), not quit() — quit() tries to gracefully
            // finish in-flight commands and negotiate a clean close,
            // which doesn't reliably work (and can leave the
            // retryStrategy's reconnection timers dangling) when the
            // connection was never healthy to begin with. For a
            // cache-only store where an in-flight check is already
            // allowed to be lost via the timeout+fallback path, an
            // immediate disconnect is both simpler and more robust.
            this.redis.disconnect();
        }
    }
}
