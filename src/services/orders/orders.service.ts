import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { OrderEntity, OrderStatus } from '@/database/entities/order.entity';
import { TenantContextService } from '@/common/tenant/tenant-context.service';
import {
  IdempotencyCachedResponse,
  IdempotencyService,
} from './idempotency.service';
import { CreateOrderInput } from '@/schemas/order.schema';
import { ListOrdersQuery } from '@/schemas/order.schema';
import { PlaceOrderJobPayload } from '@/queue/order-job.types';
import { badRequest, conflict, notFound } from '@/lib/errors';

export class OrdersService {
  private readonly logger = pino({ name: 'OrdersService' });

  constructor(
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly orderQueue: Queue<PlaceOrderJobPayload>,
    private readonly tenantContext: TenantContextService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async placeOrder(
    dto: CreateOrderInput,
    idempotencyKey: string,
  ): Promise<IdempotencyCachedResponse | Record<string, unknown>> {
    const tenantId = this.tenantContext.getTenantId();
    const requestId = this.tenantContext.getRequestId();

    const cached = await this.idempotency.getCached(tenantId, idempotencyKey);
    if (cached) return cached;

    const pendingResponse = {
      request_id: requestId,
      status: OrderStatus.PENDING,
    };

    const claim = await this.idempotency.tryClaimEnqueue(
      tenantId,
      idempotencyKey,
      pendingResponse,
    );

    if (claim === 'exists') {
      const again = await this.idempotency.getCached(tenantId, idempotencyKey);
      return again ?? pendingResponse;
    }

    if (claim === 'contended') {
      await this.sleep(50);
      const retry = await this.idempotency.getCached(tenantId, idempotencyKey);
      if (retry) return retry;
      throw conflict(
        'IDEMPOTENCY_CONTENTION',
        'Duplicate request in progress, retry shortly',
      );
    }

    const orderId = uuidv4();

    const pendingOrder = this.orderRepo.create({
      id: orderId,
      tenantId,
      campaignId: dto.campaign_id,
      productId: dto.product_id,
      userId: dto.user_id,
      quantity: dto.quantity,
      status: OrderStatus.PENDING,
      idempotencyKey,
      rejectionReasonCode: null,
    });

    try {
      await this.orderRepo.save(pendingOrder);
    } catch (err: unknown) {
      const existing = await this.orderRepo.findOne({
        where: { tenantId, idempotencyKey },
      });
      if (existing) {
        const cachedAgain = await this.idempotency.getCached(
          tenantId,
          idempotencyKey,
        );
        return (
          cachedAgain ?? {
            request_id: requestId,
            status: existing.status,
            order_id: existing.id,
          }
        );
      }
      throw err;
    }

    const jobPayload: PlaceOrderJobPayload = {
      tenantId,
      campaignId: dto.campaign_id,
      productId: dto.product_id,
      userId: dto.user_id,
      quantity: dto.quantity,
      idempotencyKey,
      requestId,
      orderId,
    };

    await this.orderQueue.add('place-order', jobPayload, {
      jobId: `${tenantId}:${idempotencyKey}`,
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 500 },
    });

    this.logger.info({ orderId, tenantId, requestId, action: 'enqueued' });

    return pendingResponse;
  }

  async getOrder(orderId: string): Promise<OrderEntity> {
    const tenantId = this.tenantContext.getTenantId();
    const order = await this.orderRepo.findOne({
      where: { id: orderId, tenantId },
    });
    if (!order) {
      throw notFound('ORDER_NOT_FOUND', 'Order not found');
    }
    return order;
  }

  async listOrders(
    query: ListOrdersQuery,
  ): Promise<{ data: OrderEntity[]; next_cursor: string | null }> {
    const tenantId = this.tenantContext.getTenantId();
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .take(limit + 1);

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('o.created_at >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('o.created_at < :to', { to: new Date(query.to) });
    }

    if (query.cursor) {
      const decoded = this.decodeCursor(query.cursor);
      if (!decoded) {
        throw badRequest('INVALID_CURSOR', 'Cursor is invalid');
      }
      qb.andWhere(
        '(o.created_at < :cursorAt OR (o.created_at = :cursorAt AND o.id < :cursorId))',
        { cursorAt: decoded.createdAt, cursorId: decoded.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && data.length > 0
        ? this.encodeCursor(data[data.length - 1])
        : null;

    return { data, next_cursor: nextCursor };
  }

  private encodeCursor(order: OrderEntity): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: order.createdAt.toISOString(),
        id: order.id,
      }),
    ).toString('base64url');
  }

  private decodeCursor(
    cursor: string,
  ): { createdAt: Date; id: string } | null {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { createdAt: string; id: string };
      return { createdAt: new Date(parsed.createdAt), id: parsed.id };
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
