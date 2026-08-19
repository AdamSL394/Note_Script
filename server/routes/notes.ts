/* eslint-disable max-len */
import express, { Request, Response } from 'express';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import noteController from '../controller/noteController';
import parseNotes from '../middleware/upload';
import { getVerifiedUserId } from '../middleware/checkJwt';

const router = express.Router();

// express-oauth2-jwt-bearer augments Express's Request type with `.auth`
// when checkJwt runs first, but accessed defensively here via a cast
// rather than relying on that augmentation resolving correctly in every
// environment — this is security-sensitive code, so it should fail to
// compile loudly rather than silently miss the augmentation.
const getUserId = (req: Request): string | undefined =>
    getVerifiedUserId((req as unknown as { auth?: AuthResult }).auth);

router.get('/all', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController.getAllNotes(userId);
    res.send(response);
    return;
});

router.get('/note/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController.getSingleNote(req.params.id, userId);
    res.send(response);
    return;
});

router.get('/all/order/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController.getAllNotesOrdered(userId);
    res.send(response);
    return;
});

router.get('/search/:id/:user', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // `:id` here is the search query text, not a user id — the URL's
    // `:user` param is ignored in favor of the verified token identity.
    const { id } = req.params;
    const response = await noteController.searchNotes(id, userId);
    res.send(response);
    return;
});

interface NoteRangeBody {
    start: string;
    end: string;
}

router.post('/noterange', async (req: Request<{}, unknown, NoteRangeBody>, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const { start, end } = req.body;
    const response = await noteController.getRangeNotes(userId, start, end);
    res.send(response);
    return;
});

router.delete('/delete/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    await noteController.deleteNotes(req.params.id, userId);
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
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const { edit, text, date, star, look, gym, weed, code, read, eatOut, basketball } = req.body;
    const response = await noteController.updateNote(req.params.id, userId, edit, text, date, star, look, gym, weed, code, read, eatOut, basketball);
    res.json(response);
    return;
});

router.post('/note', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // Overrides any userId the client may have included in the body
    // with the verified one, so a note can never be created on another
    // user's behalf.
    const response = await noteController.postNotes({ ...req.body, userId });
    res.send(response);
    return;
});

interface UploadBody {
    note: string;
}

router.post('/upload', async (req: Request<{}, unknown, UploadBody>, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
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
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // The URL's :userid segment is ignored in favor of the verified
    // token identity — kept in the path only because the client still
    // sends it there.
    const { lwYearAgo, tdYearAgo } = req.params;
    const response = await noteController.getRangeNotes(userId, lwYearAgo, tdYearAgo);
    res.send(response);
});

router.get('/ping', (req: Request, res: Response) => {
    res.send('Pong');
});

router.post('/aggregateNoteyears', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController.getallNoteYearsAggregate(userId);
    res.send([response[response.length - 1]]);
});

router.get('/recentlyUpdated/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // The URL's :id segment is ignored in favor of the verified token
    // identity — kept in the path only because the client still sends
    // it there.
    const response = await noteController.getMostRecentlyUpdatedNotes(userId);
    res.send(response);
});

export default router;