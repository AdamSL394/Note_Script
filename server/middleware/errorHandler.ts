import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
        (req: Request, res: Response, next: NextFunction): void => {
            fn(req, res, next).catch(next);
        };


export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    logger.error({ err, method: req.method, path: req.path }, err.message);
    res.status(500).json({ error: 'Internal server error' });
}