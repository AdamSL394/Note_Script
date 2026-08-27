"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDatabase = exports.closeDatabase = exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
let mongod;
// Real (ephemeral) MongoDB rather than mocked Mongoose models, on purpose:
// the bug class this suite exists to catch (any authenticated user could
// read/edit/delete any other user's note by guessing an _id) is a query-shape
// bug. A mocked model would happily return whatever we told it to and never
// notice that the *filter* itself was wrong.
const connect = async () => {
    mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose_1.default.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    });
};
exports.connect = connect;
const closeDatabase = async () => {
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.connection.close();
    if (mongod) {
        await mongod.stop();
    }
};
exports.closeDatabase = closeDatabase;
const clearDatabase = async () => {
    const { collections } = mongoose_1.default.connection;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
};
exports.clearDatabase = clearDatabase;
