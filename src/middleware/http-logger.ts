import { RequestHandler } from 'express';
import pinoHttp from 'pino-http';
import { HEADER_TENANT_ID } from '@/common/constants';
import { AppConfig } from '@/config/configuration';

export function createHttpLogger(config: AppConfig): RequestHandler {
  return pinoHttp({
    level: config.logLevel,
    transport:
      config.nodeEnv !== 'production'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
    genReqId: (req) => req.requestId ?? req.id,
    customProps: (req) => ({
      request_id: req.requestId,
      tenant_id: (req.headers[HEADER_TENANT_ID] as string) ?? null,
    }),
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        request_id: req.requestId,
        tenant_id: req.headers[HEADER_TENANT_ID] ?? null,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  });
}
