/* eslint-disable max-len */
import express, { Request, Response } from 'express';
import { z } from 'zod';
import noteController from '../controller/noteController';
import parseNotes from '../middleware/upload';
import { requireAuth, getRequiredUserId } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { noteRangeSchema, updateNoteSchema, createNoteSchema, uploadNotesSchema } from '../validation/schemas';
import { logger } from '../logger';

const router = express.Router();

router.get('/all', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    // parseInt on undefined/garbage query params yields NaN, which
    // falls back to the defaults below via `|| 1` / `|| 30` — an
    // invalid page/pageSize silently gets a sane default rather than
    // rejecting the request.
    const page = parseInt(String(req.query.page ?? ''), 10) || 1;
    const pageSize = parseInt(String(req.query.pageSize ?? ''), 10) || 30;
    const sortDirection = req.query.sort === 'asc' ? 'asc' : 'desc';
    const response = await noteController.getAllNotes(userId, page, pageSize, sortDirection);
    res.json(response);
    return;
});

router.get('/count', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const count = await noteController.getNoteCount(userId);
    res.json({ count });
    return;
});

router.get('/analytics/tags', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getTagAnalytics(userId);
    res.json(response);
    return;
});

router.get('/analytics/trends', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const period = req.query.period === 'month' || req.query.period === 'year' ? req.query.period : 'week';
    const response = await noteController.getTagTrends(userId, period);
    res.json(response);
    return;
});

router.get('/analytics/timeseries', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const granularity =
        req.query.granularity === 'week' || req.query.granularity === 'year'
            ? req.query.granularity
            : 'month';
    const maxByGranularity = { week: 52, month: 36, year: 10 } as const;
    const requestedCount = Number(req.query.count);
    const defaultByGranularity = { week: 12, month: 12, year: 5 } as const;
    const count =
        Number.isFinite(requestedCount) && requestedCount > 0
            ? Math.min(requestedCount, maxByGranularity[granularity])
            : defaultByGranularity[granularity];
    const response = await noteController.getTagTimeSeries(userId, granularity, count);
    res.json(response);
    return;
});

router.get('/analytics/heatmap', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const tagName = typeof req.query.tag === 'string' && req.query.tag.length > 0 ? req.query.tag : undefined;
    const response = await noteController.getActivityHeatmap(userId, tagName);
    res.json(response);
    return;
});

router.get('/analytics/streaks', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getTagStreaks(userId);
    res.json(response);
    return;
});

router.get('/analytics/dayofweek', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getTagDayOfWeekPattern(userId);
    res.json(response);
    return;
});

router.get('/analytics/seasonality', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getTagSeasonality(userId);
    res.json(response);
    return;
});

router.get('/note/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getSingleNote(req.params.id, userId);
    res.send(response);
    return;
});

router.get('/all/order', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getAllNotesOrdered(userId);
    res.send(response);
    return;
});

router.get('/search/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
    const userId = getRequiredUserId(req);
    // `:id` here is the search query text, not a user id.
    const { id } = req.params;
    try {
        const response = await noteController.searchNotes(id, userId);
        res.send(response);
    } catch (err) {
        // searchNotes uses Atlas Search ($search), which isn't
        // available against a plain/local MongoDB or
        // mongodb-memory-server -- meaning this catch block fires on
        // *every* search request in any non-Atlas environment, not as
        // a rare edge case. 503 (not 500) signals "this feature isn't
        // available here" rather than "something unexpected broke".
        logger.error({ err, query: id }, 'Search failed');
        res.status(503).json({ error: 'Search is temporarily unavailable' });
    }
    return;
});

type NoteRangeBody = z.infer<typeof noteRangeSchema>;

router.post('/noterange', requireAuth, validateBody(noteRangeSchema), async (req: Request<Record<string, never>, unknown, NoteRangeBody>, res: Response) => {
    const userId = getRequiredUserId(req);
    const { start, end, sort } = req.body;
    const response = await noteController.getRangeNotes(userId, start, end, sort ?? 'desc');
    res.send(response);
    return;
});

router.delete('/delete/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
    const userId = getRequiredUserId(req);
    await noteController.deleteNotes(req.params.id, userId);
    res.json('Delete Notes');
    return;
});

type UpdateNoteBody = z.infer<typeof updateNoteSchema>;

router.patch('/update/:id', requireAuth, validateBody(updateNoteSchema), async (req: Request<{ id: string }, unknown, UpdateNoteBody>, res: Response) => {
    const userId = getRequiredUserId(req);
    const { edit, text, date, star, tags, look, gym, weed, code, read, eatOut, basketball } = req.body;
    const response = await noteController.updateNote(req.params.id, userId, {
        edit, text, date, star, tags, look, gym, weed, code, read, eatOut, basketball,
    });
    res.json(response);
    return;
});

router.post('/note', requireAuth, validateBody(createNoteSchema), async (req: Request, res: Response) => {
    // Overrides any userId the client may have included in the body
    // with the verified one, so a note can never be created on another
    // user's behalf. req.body has already been through createNoteSchema
    // by this point (see validateBody), so this is the validated shape,
    // not raw client input.
    const userId = getRequiredUserId(req);
    const response = await noteController.postNotes({ ...req.body, userId });
    res.send(response);
    return;
});

type UploadBody = z.infer<typeof uploadNotesSchema>;

router.post('/upload', requireAuth, validateBody(uploadNotesSchema), async (req: Request<Record<string, never>, unknown, UploadBody>, res: Response) => {
    const userId = getRequiredUserId(req);
    const arrayOfNotes = await parseNotes(userId, { note: req.body.note });

    const results: string[] = [];
    for (const note of arrayOfNotes) {
        const result = await noteController.uploadNotes(note);
        results.push(result);
    }

    const successCount = results.filter((r) => r === 'correct').length;
    const failureCount = results.length - successCount;
    if (failureCount > 0) {
        res.status(207).json({
            message: `${successCount} of ${results.length} notes uploaded successfully`,
            successCount,
            failureCount,
        });
        return;
    }
    res.json({ message: `${successCount} notes uploaded successfully`, successCount, failureCount: 0 });
});

router.get('/lastyear/:tdYearAgo/:lwYearAgo', requireAuth, async (req: Request<{ tdYearAgo: string; lwYearAgo: string }>, res: Response) => {
    const userId = getRequiredUserId(req);
    const { lwYearAgo, tdYearAgo } = req.params;
    const sortDirection = req.query.sort === 'asc' ? 'asc' : 'desc';
    const response = await noteController.getRangeNotes(userId, lwYearAgo, tdYearAgo, sortDirection);
    res.send(response);
});

// Deliberately no requireAuth here — this only needs a valid JWT
// (already enforced by router-level checkJwt in server.ts), not a
// resolved userId. Kept exactly as before so this stays reachable by
// any authenticated caller regardless of whether their token carries a
// usable `sub` claim.
router.get('/ping', (req: Request, res: Response) => {
    res.send('Pong');
});

router.post('/aggregateNoteyears', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getallNoteYearsAggregate(userId);
    res.send([response[response.length - 1]]);
});

router.get('/recentlyUpdated', requireAuth, async (req: Request, res: Response) => {
    const userId = getRequiredUserId(req);
    const response = await noteController.getMostRecentlyUpdatedNotes(userId);
    res.send(response);
});

export default router;
