"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = __importDefault(require("../controller/userController"));
const checkJwt_1 = require("../middleware/checkJwt");
const router = express_1.default.Router();
const getUserId = (req) => (0, checkJwt_1.getVerifiedUserId)(req.auth);
router.get('/callback', async (req, res) => {
    return res.sendStatus(200);
});
router.post('/user/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const userDetails = req.body['user'];
    const user = await userController_1.default.getSingleUser(userId, userDetails);
    const searchedUser = user[0];
    res.status(201).json({ 'searchedUser': searchedUser });
    return;
});
router.post('/user/trackedstats/:id', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).send('Unauthorized');
        return;
    }
    const stats = req.body.trackedStats;
    const userDetails = req.body['user'];
    const user = await userController_1.default.updateUserStats(userId, userDetails, stats);
    res.send(user);
    return;
});
exports.default = router;
