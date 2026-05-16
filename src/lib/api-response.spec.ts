import { Request, Response } from 'express';
import {
  buildErrorBody,
  buildSuccessBody,
  sendError,
  sendSuccess,
} from './api-response';
import { HttpError } from './errors';

describe('api-response', () => {
  const req = { requestId: 'req-123' } as Request;

  it('builds success body', () => {
    const body = buildSuccessBody(req, { id: '1' }, { next_cursor: null });
    expect(body).toEqual({
      success: true,
      request_id: 'req-123',
      data: { id: '1' },
      meta: { next_cursor: null },
    });
  });

  it('builds error body', () => {
    const body = buildErrorBody(req, 'NOT_FOUND', 'Missing');
    expect(body).toEqual({
      success: false,
      request_id: 'req-123',
      error: { code: 'NOT_FOUND', message: 'Missing' },
    });
  });

  it('sendSuccess calls res.json with envelope', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    sendSuccess(res, req, { ok: true }, 200);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      request_id: 'req-123',
      data: { ok: true },
    });
  });

  it('sendError calls res.json with error envelope', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    sendError(res, req, new HttpError(404, 'NOT_FOUND', 'Gone'));

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      request_id: 'req-123',
      error: { code: 'NOT_FOUND', message: 'Gone' },
    });
  });
});
