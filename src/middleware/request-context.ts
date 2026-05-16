import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_REQUEST_ID, HEADER_TENANT_ID } from '@/common/constants';
import { TenantContextService } from '@/common/tenant/tenant-context.service';

export function requestContextMiddleware(
  tenantContext: TenantContextService,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId =
      (req.headers[HEADER_REQUEST_ID] as string) ?? uuidv4();
    const tenantId = req.headers[HEADER_TENANT_ID] as string | undefined;

    req.requestId = requestId;
    res.setHeader(HEADER_REQUEST_ID, requestId);

    if (tenantId) {
      tenantContext.run({ tenantId, requestId }, () => next());
    } else {
      next();
    }
  };
}
