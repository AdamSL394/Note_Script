import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
        (req: Request, res: Response, next: NextFunction): void => {
            fn(req, res, next).catch(next);
        };


// Different libraries in this codebase raise errors with the intended
// HTTP status under different property names -- express-oauth2-jwt-
// bearer uses `status` (e.g. a genuine, expected 401 for a missing or
// invalid token), while other code (e.g. web-push's errors in
// pushController.ts) uses `statusCode`. Checking both, rather than
// just one, is what makes this handler actually respect either.
function getErrorStatus(err: Error): number | undefined {
    const status = (err as { status?: unknown; statusCode?: unknown }).status
        ?? (err as { statusCode?: unknown }).statusCode;
    return typeof status === 'number' && status >= 400 && status < 600 ? status : undefined;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    logger.error({ err, method: req.method, path: req.path }, err.message);
    const status = getErrorStatus(err) ?? 500;
    // 4xx errors are client-caused and their message is normally safe
    // and useful to surface (e.g. "invalid_token") -- 5xx stays a
    // generic message regardless of what the real error says, so
    // internal details are never leaked to the client even though the
    // full error is already logged above either way.
    const message = status >= 400 && status < 500 ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
}