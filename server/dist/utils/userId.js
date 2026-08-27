"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUserId = void 0;
const normalizeUserId = (rawId) => rawId.length !== 24 ? rawId + '000' : rawId;
exports.normalizeUserId = normalizeUserId;
