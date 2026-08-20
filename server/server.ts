import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import notesRouter from './routes/notes';
import userRouter from './routes/userSettings';
import bodyParser from 'body-parser';
import connectToDB from './database/db';
import checkJwt from './middleware/checkJwt';
import config from './config/config.json';


const app = express();

const environment = (process.env.NODE_ENV || 'production') as keyof typeof config;
const environmentCreds = config[environment];

async function main() {
  try {
    await connectToDB(process.env.MONGODB_URI || environmentCreds.mongodb);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

app.use(helmet());
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
  app.use('/users', checkJwt, notesRouter);
  app.use('/api/users', checkJwt, userRouter);
  app.get('*', function (req: Request, res: Response) {
    res.sendFile('index.html', { root });
  });
}

app.use(errorHandler);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});