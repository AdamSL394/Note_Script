import express, { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import * as pushController from '../controller/pushController';

const router = express.Router();

router.get('/vapid-public-key', requireAuth, (req: Request, res: Response) => {
    const key = pushController.getVapidPublicKey();
    if (!key) {
        res.status(503).json({ error: 'Push notifications are not configured on this server.' });
        return;
    }
    res.json({ publicKey: key });
    return;
});

const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});
type SubscriptionBody = z.infer<typeof subscriptionSchema>;

router.post(
    '/subscribe',
    requireAuth,
    validateBody(subscriptionSchema),
    async (req: Request<Record<string, never>, unknown, SubscriptionBody>, res: Response) => {
        const userId = getRequiredUserId(req);
        await pushController.saveSubscription(userId, req.body);
        res.json({ success: true });
        return;
    }
);

const unsubscribeSchema = z.object({ endpoint: z.string().url() });
type UnsubscribeBody = z.infer<typeof unsubscribeSchema>;

router.post(
    '/unsubscribe',
    requireAuth,
    validateBody(unsubscribeSchema),
    async (req: Request<Record<string, never>, unknown, UnsubscribeBody>, res: Response) => {
        await pushController.removeSubscription(req.body.endpoint);
        res.json({ success: true });
        return;
    }
);

const preferencesSchema = z.object({
    enabled: z.boolean(),
    reminderHour: z.number().int().min(0).max(23),
    timezoneOffsetMinutes: z.number().int(),
});
type PreferencesBody = z.infer<typeof preferencesSchema>;

router.post(
    '/preferences',
    requireAuth,
    validateBody(preferencesSchema),
    async (req: Request<Record<string, never>, unknown, PreferencesBody>, res: Response) => {
        const userId = getRequiredUserId(req);
        await pushController.updateNotificationPreferences(userId, req.body);
        res.json({ success: true });
        return;
    }
);

router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const preferences = await pushController.getNotificationPreferences(userId);
    res.json(preferences ?? { enabled: false, reminderHour: 20, timezoneOffsetMinutes: 0 });
    return;
});

router.post('/test', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    try {
        const result = await pushController.sendTestNotification(userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Could not send test notification.' });
    }
    return;
});

export default router;
