import pino from 'pino';
import { redactMongoCredentials } from '../utils/redactSecrets';

// Rebuilds the same serializer config logger.ts uses, piped to an
// in-memory stream instead of stdout, so the actual serialized JSON
// output can be inspected directly -- this verifies the real
// end-to-end behavior through pino itself, not just the standalone
// redactMongoCredentials function in isolation.
function buildTestLogger() {
    const chunks: string[] = [];
    const stream = {
        write: (chunk: string) => {
            chunks.push(chunk);
            return true;
        },
    };
    const testLogger = pino(
        {
            serializers: {
                err: (err: Error) => {
                    const serialized = pino.stdSerializers.err(err);
                    if (typeof serialized.message === 'string') {
                        serialized.message = redactMongoCredentials(serialized.message);
                    }
                    if (typeof serialized.stack === 'string') {
                        serialized.stack = redactMongoCredentials(serialized.stack);
                    }
                    return serialized;
                },
            },
            hooks: {
                logMethod(inputArgs: unknown[], method: (...args: unknown[]) => void) {
                    const redactedArgs = inputArgs.map((arg) =>
                        typeof arg === 'string' ? redactMongoCredentials(arg) : arg
                    );
                    method.apply(this, redactedArgs);
                },
            },
        },
        stream
    );
    return { testLogger, chunks };
}

describe('logger err serializer', () => {
    it('redacts credentials from a real logged error, end to end', () => {
        const { testLogger, chunks } = buildTestLogger();
        const err = new Error('failed to parse mongodb://realuser:realpass@cluster0.mongodb.net/db');

        testLogger.error({ err }, 'MongoDB connection failed');

        const logged = JSON.parse(chunks[0]);
        expect(logged.err.message).not.toContain('realuser');
        expect(logged.err.message).not.toContain('realpass');
        expect(logged.err.message).toContain('[REDACTED]');
        expect(logged.err.message).toContain('cluster0.mongodb.net');
    });

    it('redacts credentials from the error stack too, not just the message', () => {
        const { testLogger, chunks } = buildTestLogger();
        // A stack trace's first line is the error's own message, so a
        // credential embedded in message also ends up in stack unless
        // that's redacted too.
        const err = new Error('mongodb+srv://svc:hunter2@prod.xyz.mongodb.net timeout');

        testLogger.error({ err }, 'Connection attempt failed');

        const logged = JSON.parse(chunks[0]);
        expect(logged.err.stack).not.toContain('hunter2');
        expect(logged.err.stack).toContain('[REDACTED]');
    });

    it('does not alter an error message with no credentials in it', () => {
        const { testLogger, chunks } = buildTestLogger();
        const err = new Error('Connection timed out after 30000ms');

        testLogger.error({ err }, 'MongoDB connection attempt failed');

        const logged = JSON.parse(chunks[0]);
        expect(logged.err.message).toBe('Connection timed out after 30000ms');
    });

    it('redacts the top-level message field too -- errorHandler.ts\'s exact call pattern', () => {
        const { testLogger, chunks } = buildTestLogger();
        const err = new Error('mongodb://leakeduser:leakedpass@cluster0.mongodb.net timeout');

        // Matches errorHandler.ts exactly: logger.error({ err, ... }, err.message)
        // -- err.message passed a second time as the log's own top-
        // level message, separate from the err object. Confirmed by
        // direct testing that this bypasses a field-only err
        // serializer entirely; only the logMethod hook closes it.
        testLogger.error({ err, method: 'GET', path: '/notes' }, err.message);

        const logged = JSON.parse(chunks[0]);
        expect(logged.msg).not.toContain('leakeduser');
        expect(logged.msg).not.toContain('leakedpass');
        expect(logged.msg).toContain('[REDACTED]');
    });
});
