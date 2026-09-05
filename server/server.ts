import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import notesRouter from './routes/notes';
import userRouter from './routes/userSettings';
import bodyParser from 'body-parser';
import connectToDB from './database/db';
import checkJwt, { auth0Domain } from './middleware/checkJwt';
import { apiRateLimiter, rateLimitStore } from './middleware/apiRateLimiter';
import { resolveMongoUri } from './validateEnv';
import { logger } from './logger';

const app = express();

// Heroku's router sits in front of every dyno as a reverse proxy --
// without this, req.ip returns Heroku's internal routing address for
// every single request, making IP-based rate limiting completely
// useless (every real client would appear to share one IP, and the
// whole app would share one rate-limit budget). `1` trusts exactly one
// hop of proxy (Heroku's own router), not an arbitrary chain.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Default CSP has no connect-src at all, which falls back to
        // default-src 'self' -- blocking the Auth0 SDK's direct
        // browser-to-Auth0 call to exchange the OAuth code for a
        // token. Scoped to the exact configured tenant domain, not a
        // broad *.auth0.com wildcard that would trust every Auth0
        // customer's tenant.
        'connect-src': ["'self'", `https://${auth0Domain}`, 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
        // Default img-src is 'self' data: only -- blocks the Google
        // profile picture shown after logging in via Google OAuth
        // (through Auth0). Wildcarded subdomain since Google serves
        // these across several numbered hosts (lh1-lh6 historically),
        // not always the same one for a given user. Also allows GA4's
        // pixel-fallback tracking domain.
        'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com', 'https://www.google-analytics.com'],
        // GA4's loader script (gtag.js) is hosted here -- default
        // script-src is 'self' only, which blocks it entirely.
        'script-src': ["'self'", 'https://www.googletagmanager.com'],
        'frame-src': [`https://${auth0Domain}`],
      },
    },
  })
);
app.use(
  pinoHttp({
    logger,
    // Full header dumps on every single request -- including the raw
    // bearer token in plaintext -- were both noisy and a real security
    // hygiene issue. Tokens shouldn't sit in logs even in development;
    // logs get pasted into chat, screenshotted, and shipped to
    // aggregators. Redact unconditionally, regardless of log level or
    // whatever the serializers below end up including.
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[redacted]',
    },
    // One compact line per request instead of the full req/res object
    // dump -- deeper error context is already handled separately by
    // errorHandler.ts when something actually fails.
    customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
    // Just the remaining count, not the full header — express-rate-limit
    // attaches this to req.rateLimit once its middleware has run, and
    // since this logs on response finish (after the whole middleware
    // chain completes), it's already populated by the time this reads
    // it. undefined on routes the rate limiter doesn't cover (static
    // assets, the SPA fallback).
    customProps: (req) => ({
      rateLimitRemaining: (req as Request & { rateLimit?: { remaining: number } }).rateLimit?.remaining,
    }),
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use('/notes', checkJwt, apiRateLimiter, notesRouter);
app.use('/api/users', checkJwt, apiRateLimiter, userRouter);

if (
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'production'
) {
  const root = path.join(__dirname, '..', '..', 'client', 'build');
  app.use(express.static(root));
  app.get('/{*splat}', function (req: Request, res: Response) {
    res.sendFile('index.html', { root });
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Was fire-and-forget (`main()` called without awaiting, with
// `app.listen()` running immediately after) — meaning the server could
// start accepting HTTP traffic before the database connection was even
// established, or ever confirmed to succeed at all. Now the DB
// connection is fully awaited (including its own retry/backoff, see
// database/db.ts) before the server starts listening, and a connection
// failure after all retries are exhausted exits the process instead of
// serving requests against a database that was never reachable.
async function main() {
  const mongoUri = resolveMongoUri();
  try {
    await connectToDB(mongoUri);
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to MongoDB after retries, exiting');
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`App listening on port ${PORT}`);
  });
}

main();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await rateLimitStore.shutdown();
  process.exit(0);
});
