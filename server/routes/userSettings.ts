import express, { Request, Response } from 'express';
import { z } from 'zod';
import userController from '../controller/userController';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { getUserSchema, trackedStatsSchema } from '../validation/schemas';

const router = express.Router();

// Deliberately no requireAuth here — see notes.ts's /ping for the same
// reasoning. Only needs a valid JWT (enforced by router-level checkJwt),
// not a resolved userId.
router.get('/callback', async (req: Request, res: Response) => {
    return res.sendStatus(200);
});

type UserBody = z.infer<typeof getUserSchema>;

router.post('/user', requireAuth, validateBody(getUserSchema), async (req: Request<Record<string, never>, unknown, UserBody>, res: Response) => {
    const userId = getRequiredUserId(req);
    const userDetails = req.body['user'];
    const user = await userController.getSingleUser(userId, userDetails);
    const searchedUser = user[0];
    res.status(201).json({ 'searchedUser': searchedUser });
    return;
});

type TrackedStatsBody = z.infer<typeof trackedStatsSchema>;

router.post('/user/trackedstats', requireAuth, validateBody(trackedStatsSchema), async (req: Request<Record<string, never>, unknown, TrackedStatsBody>, res: Response) => {
    const userId = getRequiredUserId(req);
    const stats = req.body.trackedStats;
    const userDetails = req.body['user'];
    const user = await userController.updateUserStats(userId, userDetails, stats);
    res.send(user);
    return;
});

router.get('/admin/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const users = await userController.getAllUsers();
    res.json(users);
    return;
});

export default router;
