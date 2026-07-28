import type { ErrorRequestHandler } from 'express';
import { AppError } from './errors';

export const httpErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        res.status(err.status).json({
            error: { code: err.code, message: err.message, details: err.details ?? null },
        });
        return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: null },
    });
};
