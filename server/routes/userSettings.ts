import express, { Request, Response } from 'express';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import userController from '../controller/userController';
import { getVerifiedUserId } from '../middleware/checkJwt';

const router = express.Router();

const getUserId = (req: Request): string | undefined =>
    getVerifiedUserId((req as unknown as { auth?: AuthResult }).auth);

router.get('/callback', async (req: Request, res: Response) => {
    return res.sendStatus(200);
});

interface UserBody {
    user: { email: string };
}

router.post('/user/:id', async (req: Request<{ id: string }, unknown, UserBody>, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // The URL's :id segment is ignored in favor of the verified token
    // identity — kept in the path only because the client still sends
    // it there.
    const userDetails = req.body['user'];
    const user = await userController.getSingleUser(userId, userDetails);
    const searchedUser = user[0];
    res.status(201).json({ 'searchedUser': searchedUser });
    return;
});

interface TrackedStatsBody {
    user: { email: string };
    trackedStats: { icon: string; name: string; visible: 'visible' | 'hidden' };
}

router.post('/user/trackedstats/:id', async (req: Request<{ id: string }, unknown, TrackedStatsBody>, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const stats = req.body.trackedStats;
    const userDetails = req.body['user'];
    const user = await userController.updateUserStats(userId, userDetails, stats);
    res.send(user);
    return;
});

export default router;