import express, { Request, Response } from 'express';
import ContactSubmission from '../models/contactSubmission';
import checkJwt from '../middleware/checkJwt';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { contactFormSchema } from '../validation/schemas';
import { contactFormRateLimiter } from '../middleware/contactFormRateLimiter';
import { logger } from '../logger';

const router = express.Router();

// Deliberately public -- no requireAuth. A visitor reading the Privacy
// Policy or Terms of Service before ever signing up (or a user who
// isn't logged in at all) needs to be able to reach this. Protected
// instead by contactFormRateLimiter (IP-keyed, 5/15min) and
// contactFormSchema (length limits) rather than authentication, since
// there's no logged-in identity here to hold accountable for abuse.
router.post('/submit', contactFormRateLimiter, validateBody(contactFormSchema), async (req: Request, res: Response) => {
    try {
        const { email, message } = req.body as { email: string; message: string };
        await ContactSubmission.create({ email, message });
        res.status(201).json({ status: 'ok' });
    } catch (err) {
        logger.error({ err }, 'Failed to save contact form submission');
        res.status(500).json({ error: 'Failed to submit -- please try again' });
    }
    return;
});

router.get('/submissions', checkJwt, requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    try {
        const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        logger.error({ err, userId }, 'Failed to fetch contact form submissions');
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
    return;
});

export default router;
