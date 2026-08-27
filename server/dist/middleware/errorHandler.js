"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.asyncHandler = void 0;
const asyncHandler = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
function errorHandler(err, req, res, next) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
}
exports.errorHandler = errorHandler;
