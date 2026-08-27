"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable max-len */
const express_1 = __importDefault(require("express"));
const noteController_1 = __importDefault(require("../controller/noteController"));
const upload_1 = __importDefault(require("../middleware/upload"));
const checkJwt_1 = require("../middleware/checkJwt");
const router = express_1.default.Router();
// express-oauth2-jwt-bearer augments Express's Request type with `.auth`
// when checkJwt runs first, but accessed defensively here via a cast
// rather than relying on that augmentation resolving correctly in every
// environment — this is security-sensitive code, so it should fail to
// compile loudly rather than silently miss the augmentation.
const getUserId = (req) => (0, checkJwt_1.getVerifiedUserId)(req.auth);
router.get('/all', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController_1.default.getAllNotes(userId);
    res.send(response);
    return;
});
router.get('/count', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const count = await noteController_1.default.getNoteCount(userId);
    res.json({ count });
    return;
});
router.get('/note/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController_1.default.getSingleNote(req.params.id, userId);
    res.send(response);
    return;
});
router.get('/all/order/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController_1.default.getAllNotesOrdered(userId);
    res.send(response);
    return;
});
router.get('/search/:id/:user', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // `:id` here is the search query text, not a user id — the URL's
    // `:user` param is ignored in favor of the verified token identity.
    const { id } = req.params;
    const response = await noteController_1.default.searchNotes(id, userId);
    res.send(response);
    return;
});
router.post('/noterange', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const { start, end } = req.body;
    const response = await noteController_1.default.getRangeNotes(userId, start, end);
    res.send(response);
    return;
});
router.delete('/delete/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    await noteController_1.default.deleteNotes(req.params.id, userId);
    res.json('Delete Notes');
    return;
});
router.patch('/update/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const { edit, text, date, star, look, gym, weed, code, read, eatOut, basketball } = req.body;
    const response = await noteController_1.default.updateNote(req.params.id, userId, edit, text, date, star, look, gym, weed, code, read, eatOut, basketball);
    res.json(response);
    return;
});
router.post('/note', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // Overrides any userId the client may have included in the body
    // with the verified one, so a note can never be created on another
    // user's behalf.
    const response = await noteController_1.default.postNotes({ ...req.body, userId });
    res.send(response);
    return;
});
router.post('/upload', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const arrayOfNotes = await (0, upload_1.default)(userId, { note: req.body.note });
    const data = [];
    const results = [];
    for (const note of arrayOfNotes) {
        const result = await noteController_1.default.uploadNotes(note);
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
router.get('/lastyear/:userid/:tdYearAgo/:lwYearAgo', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // The URL's :userid segment is ignored in favor of the verified
    // token identity — kept in the path only because the client still
    // sends it there.
    const { lwYearAgo, tdYearAgo } = req.params;
    const response = await noteController_1.default.getRangeNotes(userId, lwYearAgo, tdYearAgo);
    res.send(response);
});
router.get('/ping', (req, res) => {
    res.send('Pong');
});
router.post('/aggregateNoteyears', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const response = await noteController_1.default.getallNoteYearsAggregate(userId);
    res.send([response[response.length - 1]]);
});
router.get('/recentlyUpdated/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    // The URL's :id segment is ignored in favor of the verified token
    // identity — kept in the path only because the client still sends
    // it there.
    const response = await noteController_1.default.getMostRecentlyUpdatedNotes(userId);
    res.send(response);
});
exports.default = router;
