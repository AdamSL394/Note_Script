import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Validates req.body against the given schema before the route handler
// runs. On success, req.body is *replaced* with the parsed result — zod
// strips any unrecognized keys by default, so downstream code only ever
// sees the exact shape the schema describes, never whatever extra
// fields a client happened to include.
//
// This is what closes the gap discussed around the mongoose NoSQL
// injection advisories: previously a field typed `text: string` in a
// TypeScript interface provided zero runtime protection — a client
// could send `{ "text": { "$ne": null } }` and that object would flow
// straight through to Mongoose. `z.string()` rejects that shape here,
// before it ever reaches the database layer, regardless of whether
// Mongoose's own casting would have caught it.
export const validateBody = (schema: ZodType) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Invalid request body',
                details: result.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }
        req.body = result.data;
        next();
    };
