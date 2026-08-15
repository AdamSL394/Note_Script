import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import notesRouter from './routes/notes';
import userRouter from './routes/userSettings';
import config from './config/config.json';
import bodyParser from 'body-parser';
import connectToDB from './database/db';
import checkJwt from './middleware/checkJwt';

const app = express();

// `resolveJsonModule` means TS already knows config.json's exact shape —
// `keyof typeof config` gives the real union of environment keys
// automatically, rather than a hand-written interface that could drift.
const environment = (process.env.NODE_ENV || 'development') as keyof typeof config;

console.log('Host environment', process.env.NODE_ENV);

async function main() {
  try {
    await connectToDB(process.env.MONGODB_URI || config[environment].mongodb);
  } catch (err) {
    console.error(err);
    process.exit(1); // don't let the server come up looking healthy with no DB connection
  }
}

main();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
// checkJwt rejects any request without a valid, verified Auth0 access
// token before it ever reaches these routers — route handlers can now
// trust that a request making it this far is genuinely authenticated,
// and derive the actual user identity from the verified token rather
// than any client-submitted id.
app.use('/notes', checkJwt, notesRouter);
app.use('/api/users', checkJwt, userRouter);

if (
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'production'
) {
  const root = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(root));
  app.use('/users', checkJwt, notesRouter);
  app.use('/api/users', checkJwt, userRouter);
  app.get('*', function (req: Request, res: Response) {
    res.sendFile('index.html', { root });
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});