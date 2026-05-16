import { Request, Response, NextFunction } from 'express';
import { HttpError } from '@/lib/errors';
import pino from 'pino';

const logger = pino({ name: 'error-handler' });

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof HttpError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      request_id: requestId,
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled exception');
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    request_id: requestId,
  });
}
