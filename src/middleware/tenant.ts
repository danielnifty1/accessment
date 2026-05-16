import { Request, Response, NextFunction } from 'express';
import { HEADER_TENANT_ID } from '@/common/constants';
import { badRequest } from '@/lib/errors';

export function requireTenant(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const tenantId = _req.headers[HEADER_TENANT_ID] as string | undefined;

  if (!tenantId || tenantId.trim().length === 0) {
    next(badRequest('TENANT_REQUIRED', 'X-Tenant-Id header is required'));
    return;
  }

  if (!/^[a-zA-Z0-9_-]{1,36}$/.test(tenantId)) {
    next(badRequest('TENANT_INVALID', 'X-Tenant-Id format is invalid'));
    return;
  }

  next();
}
