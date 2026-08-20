import { NextFunction, Request, Response } from 'express';

export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
        (req: Request, res: Response, next: NextFunction): void => {
            fn(req, res, next).catch(next);
        };


export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
}