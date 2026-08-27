"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerifiedUserId = void 0;
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
const config_json_1 = __importDefault(require("./../config/config.json"));
const userId_1 = require("../utils/userId");
const environment = (process.env.NODE_ENV || 'development');
if (!config_json_1.default[environment]["auth0"]) {
    throw new Error(`Missing "auth0" config block for environment "${String(environment)}" in config.json`);
}
const verifyJwt = (0, express_oauth2_jwt_bearer_1.auth)({
    audience: config_json_1.default[environment]["auth0"]['audience'],
    issuerBaseURL: `https://${config_json_1.default[environment]["auth0"]['domain']}`,
});
const checkJwt = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    return verifyJwt(req, res, next);
};
const getVerifiedUserId = (auth) => {
    const sub = auth?.payload?.sub;
    if (!sub)
        return undefined;
    const rawId = sub.split('|')[1] ?? sub;
    return (0, userId_1.normalizeUserId)(rawId);
};
exports.getVerifiedUserId = getVerifiedUserId;
exports.default = checkJwt;
