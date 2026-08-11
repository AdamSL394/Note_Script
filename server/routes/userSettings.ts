import express, { Request, Response } from 'express';
import userController from '../controller/userController';

const router = express.Router();

router.get('/callback', (_req: Request, res: Response) => {
  return res.sendStatus(200);
});

router.post('/user/:id', async (req: Request, res: Response) => {
  let id = req.params.id;

  if (id.length !== 24) {
    id += '000';
  }

  const userDetails = req.body.user;

  const user = await userController.getSingleUser(id, userDetails);
  const searchedUser = user[0];

  return res.status(201).json({ searchedUser });
});

router.post('/user/trackedstats/:id', async (req: Request, res: Response) => {
  let id = req.params.id;

  if (id.length !== 24) {
    id += '000';
  }

  const userDetails = req.body.user;
  const stats = req.body.trackedStats;

  const user = await userController.updateUserStats(
    id,
    userDetails,
    stats
  );

  return res.send(user);
});

export default router;