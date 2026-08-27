"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const testDb = __importStar(require("./helpers/db"));
const user_1 = __importDefault(require("../models/user"));
const userController_1 = __importDefault(require("../controller/userController"));
const userA = new mongoose_1.default.Types.ObjectId().toHexString();
const userB = new mongoose_1.default.Types.ObjectId().toHexString();
beforeAll(async () => {
    await testDb.connect();
});
afterAll(async () => {
    await testDb.closeDatabase();
});
afterEach(async () => {
    await testDb.clearDatabase();
});
describe('getSingleUser', () => {
    it('returns the existing user without creating a duplicate', async () => {
        await new user_1.default({ _id: userA, email: 'a@example.com', settings: [] }).save();
        const result = await userController_1.default.getSingleUser(userA, { email: 'a@example.com' });
        expect(result).toHaveLength(1);
        expect(await user_1.default.countDocuments({ _id: userA })).toBe(1);
    });
    it('auto-provisions a new user on first login (empty find result)', async () => {
        const result = await userController_1.default.getSingleUser(userA, { email: 'new@example.com' });
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('new@example.com');
        const stored = await user_1.default.findById(userA);
        expect(stored).not.toBeNull();
    });
    it("never returns User B's record when looking up User A", async () => {
        await new user_1.default({ _id: userB, email: 'b@example.com', settings: [] }).save();
        const result = await userController_1.default.getSingleUser(userA, { email: 'a@example.com' });
        // Because User A didn't exist, this auto-provisions A rather than
        // ever surfacing B's document.
        expect(result).toHaveLength(1);
        expect(result[0]._id.toString()).toBe(userA);
    });
});
describe('updateUserStats', () => {
    it('adds a new tracked stat for a user with none yet', async () => {
        await new user_1.default({ _id: userA, email: 'a@example.com', settings: [] }).save();
        const stat = { icon: 'star', name: 'gym', visible: 'visible' };
        const updated = await userController_1.default.updateUserStats(userA, { email: 'a@example.com' }, stat);
        expect(updated?.settings).toHaveLength(1);
        expect(updated?.settings[0].name).toBe('gym');
    });
    it('removes a tracked stat when it already exists (toggle-off behavior)', async () => {
        const existing = { icon: 'star', name: 'gym', visible: 'visible' };
        await new user_1.default({ _id: userA, email: 'a@example.com', settings: [existing] }).save();
        const updated = await userController_1.default.updateUserStats(userA, { email: 'a@example.com' }, existing);
        expect(updated?.settings).toHaveLength(0);
    });
    it("only ever mutates the calling user's own settings, never another user's", async () => {
        await new user_1.default({ _id: userA, email: 'a@example.com', settings: [] }).save();
        await new user_1.default({
            _id: userB,
            email: 'b@example.com',
            settings: [{ icon: 'star', name: 'existing', visible: 'visible' }],
        }).save();
        await userController_1.default.updateUserStats(userA, { email: 'a@example.com' }, {
            icon: 'star',
            name: 'gym',
            visible: 'visible',
        });
        const bUnchanged = await user_1.default.findById(userB);
        expect(bUnchanged?.settings).toHaveLength(1);
        expect(bUnchanged?.settings[0].name).toBe('existing');
    });
    it('auto-provisions the user if updateUserStats is called before any prior login', async () => {
        const stat = { icon: 'star', name: 'first-ever-stat', visible: 'visible' };
        const updated = await userController_1.default.updateUserStats(userA, { email: 'brand-new@example.com' }, stat);
        expect(updated?.settings).toHaveLength(1);
        expect(await user_1.default.countDocuments({ _id: userA })).toBe(1);
    });
});
