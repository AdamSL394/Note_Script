import express, { Request, Response } from 'express';
import { z } from 'zod';
import userController from '../controller/userController';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { getUserSchema, trackedStatsSchema } from '../validation/schemas';
import { logger } from '../logger';

const router = express.Router();

// Deliberately no requireAuth here -- Auth0's callback just needs a
// valid JWT (enforced by router-level checkJwt) to confirm the login
// succeeded, not a resolved userId for any actual user-scoped lookup.
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

router.delete('/user', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    try {
        await userController.deleteAccount(userId);
        res.status(204).send();
    } catch (err) {
        logger.error({ err, userId }, 'Failed to delete account');
        res.status(500).json({ error: 'Failed to delete account' });
    }
    return;
});

router.get('/user/export', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    try {
        const data = await userController.exportUserData(userId);
        const filename = `note-script-export-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(data);
    } catch (err) {
        logger.error({ err, userId }, 'Failed to export account data');
        res.status(500).json({ error: 'Failed to export account data' });
    }
    return;
});

export default router;
