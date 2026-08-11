/* eslint-disable max-len */
import express, { Request, Response } from 'express';
import noteController from '../controller/noteController';
import parseNotes from '../middleware/upload';

const router = express.Router();

// Pads a short ID the same way throughout this file — extracted since
// this exact pattern (if length != 24, append '000') was repeated in
// nearly every route, and one instance (the /search route) had silently
// drifted to compare the string directly to the number 24 instead of
// checking `.length`, which is always true and meant that route always
// padded the ID regardless of its actual length.
const padId = (id: string): string => (id.length !== 24 ? id + '000' : id);

router.get('/all', async (req: Request, res: Response) => {
    const idParam = req.query.id as string;
    const correctlength = padId(idParam);
    const response = await noteController.getAllNotes(correctlength);
    res.send(response);
    return;
});

router.get('/note/:id', async (req: Request, res: Response) => {
    const response = await noteController.getSingleNote(req.params.id);
    res.send(response);
    return;
});

router.get('/all/order/:id', async (req: Request, res: Response) => {
    const correctlength = padId(req.params.id);
    const response = await noteController.getAllNotesOrdered(correctlength);
    res.send(response);
    return;
});

router.get('/search/:id/:user', async (req: Request, res: Response) => {
    const { id, user } = req.params;
    // Was `if (user != 24)` — comparing the userId string directly to
    // the number 24 with != is always true, so this route always
    // appended '000' regardless of the userId's actual length, unlike
    // every other route in this file. Now uses the same padId() helper
    // as everywhere else, which correctly checks `.length`.
    const correctlength = padId(user);
    const response = await noteController.searchNotes(id, correctlength);
    res.send(response);
    return;
});

interface NoteRangeBody {
    userId: string;
    start: string;
    end: string;
}

router.post('/noterange', async (req: Request<{}, unknown, NoteRangeBody>, res: Response) => {
    const correctlength = padId(req.body.userId);
    const { start, end } = req.body;
    const response = await noteController.getRangeNotes(correctlength, start, end);
    res.send(response);
    return;
});

router.delete('/delete/:id', async (req: Request, res: Response) => {
    await noteController.deleteNotes(req.params.id);
    res.json('Delete Notes');
    return;
});

interface UpdateNoteBody {
    edit: boolean;
    text: string;
    date: string;
    star: string;
    look: boolean;
    gym: boolean;
    weed: boolean;
    code: boolean;
    read: boolean;
    eatOut: boolean;
    basketball: boolean;
}

router.patch('/update/:id', async (req: Request<{ id: string }, unknown, UpdateNoteBody>, res: Response) => {
    const { edit, text, date, star, look, gym, weed, code, read, eatOut, basketball } = req.body;
    const response = await noteController.updateNote(req.params.id, edit, text, date, star, look, gym, weed, code, read, eatOut, basketball);
    res.json(response);
    return;
});

router.post('/note', async (req: Request, res: Response) => {
    const response = await noteController.postNotes(req.body);
    res.send(response);
    return;
});

interface UploadBody {
    userId: string;
    note: string;
}

router.post('/upload', async (req: Request<{}, unknown, UploadBody>, res: Response) => {
    const userId = padId(req.body.userId);
    // The middleware (upload.ts) expects an object shaped { note: string
    // }, but this route was passing the raw string directly — a
    // pre-existing mismatch between this route and the middleware that
    // would have thrown immediately (`.note` accessed on a string) had
    // it ever actually been exercised. This route also doesn't appear to
    // be wired up on the client (the /upload UI route is commented out
    // there), so it's possible this has simply never run. Wrapping the
    // string into the shape the middleware actually expects.
    const arrayOfNotes = await parseNotes(userId, { note: req.body.note });
    const data: string[] = [];

    arrayOfNotes.forEach(async (i) => {
        await noteController.uploadNotes(i).then((resp) => {
            data.push(resp);
            return resp;
        });
    });
    res.send('Sucess');
});

router.get('/lastyear/:userid/:tdYearAgo/:lwYearAgo', async (req: Request<{ userid: string; tdYearAgo: string; lwYearAgo: string }>, res: Response) => {
    const { lwYearAgo, tdYearAgo } = req.params;
    const userid = padId(req.params.userid);
    const response = await noteController.getRangeNotes(userid, lwYearAgo, tdYearAgo);
    res.send(response);
});

router.get('/ping', (req: Request, res: Response) => {
    res.send('Pong');
});

interface AggregateNoteYearsBody {
    id: string;
}

router.post('/aggregateNoteyears', async (req: Request<{}, unknown, AggregateNoteYearsBody>, res: Response) => {
    const id = padId(req.body.id);
    const response = await noteController.getallNoteYearsAggregate(id);
    res.send([response[response.length - 1]]);
});

router.get('/recentlyUpdated/:id', async (req: Request, res: Response) => {
    const correctlength = padId(req.params.id);
    const response = await noteController.getMostRecentlyUpdatedNotes(correctlength);
    res.send(response);
});

export default router;