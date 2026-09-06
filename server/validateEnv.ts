import config from './config/config.json';
import { logger } from './logger';

// Fails fast with a specific, actionable error instead of letting a
// missing config block surface later as a cryptic
// "Cannot read property 'mongodb' of undefined" the first time
// something tries to use it.
export function resolveMongoUri(): string {
    const environment = (process.env.NODE_ENV || 'production') as keyof typeof config;
    const environmentCreds = config[environment];

    if (process.env.MONGODB_URI) {
        return process.env.MONGODB_URI;
    }

    if (!environmentCreds) {
        const message =
            `No config block found for environment "${String(environment)}" in ` +
            `config.json, and MONGODB_URI is not set. Add a "${String(environment)}" ` +
            'block to config.json or set MONGODB_URI directly.';
        logger.fatal(message);
        throw new Error(message);
    }

    if (!environmentCreds.mongodb) {
        const message =
            `config.json's "${String(environment)}" block is missing a "mongodb" ` +
            'connection string, and MONGODB_URI is not set.';
        logger.fatal(message);
        throw new Error(message);
    }

    return environmentCreds.mongodb;
}