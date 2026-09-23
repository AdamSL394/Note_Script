import pino from 'pino';
import { redactMongoCredentials } from './utils/redactSecrets';

// Pretty-printed, human-readable output in development; structured JSON
// in production, which is what log aggregation platforms (Heroku's own
// log drain, Datadog, etc.) actually want to ingest.
const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    serializers: {
        // A MongoDB connection-string parsing error can embed the raw
        // URI -- credentials included -- directly in its own message
        // (a documented risk class across multiple official MongoDB
        // drivers, not just this one). Applied to every logged error
        // globally, since redacting only at the one call site that
        // surfaced this wouldn't catch it anywhere else an error might
        // flow through this logger.
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
        // The err serializer above only covers the err *object* --
        // confirmed directly that it does NOT cover the top-level log
        // message itself, which several call sites (errorHandler.ts,
        // for one) set to err.message as a separate argument. This
        // hook redacts every string argument passed to any log call,
        // regardless of its position (logger.error(msg) vs
        // logger.error(obj, msg)), closing that gap globally rather
        // than patching each call site that happens to do this.
        logMethod(inputArgs, method) {
            const redactedArgs = inputArgs.map((arg) =>
                typeof arg === 'string' ? redactMongoCredentials(arg) : arg
            );
            method.apply(this, redactedArgs as Parameters<typeof method>);
        },
    },
});
