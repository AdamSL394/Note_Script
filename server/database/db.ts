import mongoose from 'mongoose';
import { logger } from '../logger';

// Single source of truth for connecting to Mongo. Accepts the
// connection string as an argument rather than hardcoding one, so the
// caller (server.ts, a seed script, tests, etc.) decides which
// environment/URI to use instead of this module deciding for them.
//
// Explicit rather than relying on the default, which has changed across
// major Mongoose versions (true in 6.x, false starting in 7.x) — this
// restricts find()-style queries to only schema-defined fields,
// rejecting conditions on paths the schema doesn't know about.
mongoose.set('strictQuery', true);

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries with exponential backoff (1s, 2s, 4s, 8s, 16s) — a transient
// failure (network blip, Atlas maintenance window, the DB container
// still starting up on a cold deploy) previously crashed the whole
// process on the very first attempt, with no retry at all.
const connectToDB = async (connectionString: string) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const connect = await mongoose.connect(connectionString);
      logger.info(`MongoDB connected: ${connect.connection.host}`);
      return connect;
    } catch (err) {
      lastError = err;
      const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(
        { attempt, maxRetries: MAX_RETRIES, delayMs, err },
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`
      );
      if (attempt < MAX_RETRIES) {
        await sleep(delayMs);
      }
    }
  }
  logger.fatal({ err: lastError }, `MongoDB connection failed after ${MAX_RETRIES} attempts`);
  throw lastError;
};

export default connectToDB;
