import { withCache } from '../cache';

// REDIS_URL is deliberately unset in this test environment (matches
// this sandbox's actual real state, and CI's -- neither configures a
// real Redis instance for these particular tests), so every call below
// exercises the no-Redis fallback path: withCache must still work
// exactly like caching doesn't exist at all, just without actually
// caching anything.
describe('withCache (no Redis configured)', () => {
    it('returns whatever compute() returns', async () => {
        const result = await withCache('test:key', 60, async () => ({ value: 42 }));
        expect(result).toEqual({ value: 42 });
    });

    it('calls compute() every time -- nothing is actually cached without Redis', async () => {
        let callCount = 0;
        const compute = async () => {
            callCount++;
            return callCount;
        };

        const first = await withCache('test:no-cache-key', 60, compute);
        const second = await withCache('test:no-cache-key', 60, compute);

        expect(first).toBe(1);
        expect(second).toBe(2);
        expect(callCount).toBe(2);
    });

    it('propagates a real error from compute() rather than swallowing it', async () => {
        await expect(
            withCache('test:error-key', 60, async () => {
                throw new Error('a genuine computation failure');
            })
        ).rejects.toThrow('a genuine computation failure');
    });
});
