"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = __importDefault(require("./config.json"));
// `resolveJsonModule` means TS already knows config.json's exact shape
// from the file itself — `keyof typeof config` gives the real union of
// environment keys ('local' | 'staging' | 'development' | 'production')
// automatically, rather than needing a hand-written interface that could
// drift out of sync with the actual file.
const enviroment = (process.env.NODE_ENV || 'production');
const enviromentCreds = config_json_1.default[enviroment];
exports.default = enviromentCreds;
