import { Request, Response, NextFunction } from 'express';
import { HttpError } from '@/lib/errors';
import { sendError } from '@/lib/api-response';
import pino from 'pino';

const logger = pino({ name: 'error-handler' });

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    sendError(res, req, err);
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled exception');
  sendError(
    res,
    req,
    new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
  );
}
