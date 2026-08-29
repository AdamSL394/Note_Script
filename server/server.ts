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
import checkJwt from './middleware/checkJwt';
import { resolveMongoUri } from './validateEnv';
import { logger } from './logger';

const app = express();

app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use('/notes', checkJwt, notesRouter);
app.use('/api/users', checkJwt, userRouter);

if (
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'production'
) {
  const root = path.join(__dirname, '..', '..', 'client', 'build');
  app.use(express.static(root));
  app.get('*', function (req: Request, res: Response) {
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
