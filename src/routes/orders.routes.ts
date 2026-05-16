import { Router, Request } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';
import { sendAccepted, sendSuccess } from '@/lib/api-response';
import { requireTenant } from '@/middleware/tenant';
import { validateBody, validateQuery } from '@/middleware/validate';
import {
  createOrderSchema,
  listOrdersQuerySchema,
  ListOrdersQuery,
} from '@/schemas/order.schema';
import { HEADER_IDEMPOTENCY_KEY } from '@/common/constants';
import { badRequest } from '@/lib/errors';
import { OrderEntity } from '@/database/entities/order.entity';

function toDto(order: OrderEntity) {
  return {
    id: order.id,
    tenant_id: order.tenantId,
    campaign_id: order.campaignId,
    product_id: order.productId,
    user_id: order.userId,
    quantity: order.quantity,
    status: order.status,
    idempotency_key: order.idempotencyKey,
    rejection_reason_code: order.rejectionReasonCode,
    created_at: order.createdAt.toISOString(),
  };
}

export function createOrdersRouter(container: AppContainer): Router {
  const router = Router();
  const { ordersService } = container;

  router.use(requireTenant);

  router.post(
    '/',
    validateBody(createOrderSchema),
    asyncHandler(async (req, res) => {
      const idempotencyKey = req.headers[HEADER_IDEMPOTENCY_KEY] as
        | string
        | undefined;
      if (!idempotencyKey?.trim()) {
        throw badRequest(
          'IDEMPOTENCY_KEY_REQUIRED',
          'Idempotency-Key header is required',
        );
      }
      const result = await ordersService.placeOrder(
        req.body,
        idempotencyKey.trim(),
      );
      sendAccepted(res, req, result);
    }),
  );

  router.get(
    '/',
    validateQuery(listOrdersQuerySchema),
    asyncHandler(async (req, res) => {
      const query = (req as Request & { validatedQuery: ListOrdersQuery })
        .validatedQuery;
      const result = await ordersService.listOrders(query);
      sendSuccess(res, req, result.data.map(toDto), 200, {
        next_cursor: result.next_cursor,
      });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const order = await ordersService.getOrder(String(req.params.id));
      sendSuccess(res, req, toDto(order));
    }),
  );

  return router;
}
