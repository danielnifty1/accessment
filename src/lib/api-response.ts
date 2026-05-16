import { Request, Response } from 'express';
import { HttpError } from './errors';

/** Standard error body for all API failures */
export interface ApiErrorBody {
  success: false;
  request_id: string;
  error: {
    code: string;
    message: string;
  };
}

/** Standard success body for all API responses */
export interface ApiSuccessBody<T> {
  success: true;
  request_id: string;
  data: T;
  meta?: Record<string, unknown>;
}

export function getRequestId(req: Request): string {
  return req.requestId ?? 'unknown';
}

export function buildErrorBody(
  req: Request,
  code: string,
  message: string,
): ApiErrorBody {
  return {
    success: false,
    request_id: getRequestId(req),
    error: { code, message },
  };
}

export function buildSuccessBody<T>(
  req: Request,
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessBody<T> {
  const body: ApiSuccessBody<T> = {
    success: true,
    request_id: getRequestId(req),
    data,
  };
  if (meta !== undefined && Object.keys(meta).length > 0) {
    body.meta = meta;
  }
  return body;
}

/** Send a structured error response (also used by the global error handler) */
export function sendError(res: Response, req: Request, err: HttpError): void {
  res
    .status(err.status)
    .json(buildErrorBody(req, err.code, err.message));
}

/** Send a structured success response */
export function sendSuccess<T>(
  res: Response,
  req: Request,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  res.status(statusCode).json(buildSuccessBody(req, data, meta));
}

export function sendCreated<T>(
  res: Response,
  req: Request,
  data: T,
  meta?: Record<string, unknown>,
): void {
  sendSuccess(res, req, data, 201, meta);
}

export function sendAccepted<T>(
  res: Response,
  req: Request,
  data: T,
  meta?: Record<string, unknown>,
): void {
  sendSuccess(res, req, data, 202, meta);
}
