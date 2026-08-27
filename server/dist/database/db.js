"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Single source of truth for connecting to Mongo. Accepts the
// connection string as an argument rather than hardcoding one, so the
// caller (server.ts, a seed script, tests, etc.) decides which
// environment/URI to use instead of this module deciding for them.
//
// These options are NOT no-ops on Mongoose 5.x (this app's pinned
// version, per package.json) — they only became defaults/no-ops
// starting in Mongoose 6.0. On 5.x, omitting them forces the driver
// onto its old legacy URL parser and topology engine, which can fail
// TLS negotiation against modern MongoDB Atlas clusters.
const connectToDB = async (connectionString) => {
    const connect = await mongoose_1.default.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    });
    console.log(`MongoDB connected: ${connect.connection.host}`);
    return connect;
};
exports.default = connectToDB;
