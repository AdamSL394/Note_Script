import pino from 'pino';

// Pretty-printed, human-readable output in development; structured JSON
// in production, which is what log aggregation platforms (Heroku's own
// log drain, Datadog, etc.) actually want to ingest.
const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
});
