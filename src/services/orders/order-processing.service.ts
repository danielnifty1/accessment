import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  OrderEntity,
  OrderStatus,
  RejectionReasonCode,
} from '@/database/entities/order.entity';
import { CampaignEntity } from '@/database/entities/campaign.entity';
import { ProductEntity } from '@/database/entities/product.entity';
import { StockDeductionService } from './stock-deduction.service';
import { CampaignValidationService } from './campaign-validation.service';
import { IdempotencyService } from './idempotency.service';
import { MetricsService } from '@/common/metrics/metrics.service';
import { PlaceOrderJobPayload } from '@/queue/order-job.types';

export interface ProcessOrderResult {
  orderId: string;
  status: OrderStatus;
  rejectionReasonCode?: RejectionReasonCode;
}

export class OrderProcessingService {
  private readonly logger = pino({ name: 'OrderProcessingService' });

  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly stockDeduction: StockDeductionService,
    private readonly campaignValidation: CampaignValidationService,
    private readonly idempotency: IdempotencyService,
    private readonly metrics: MetricsService,
  ) {}

  async processOrder(payload: PlaceOrderJobPayload): Promise<ProcessOrderResult> {
    const {
      tenantId,
      campaignId,
      productId,
      userId,
      quantity,
      idempotencyKey,
      requestId,
    } = payload;

    const existing = await this.orderRepo.findOne({
      where: { id: payload.orderId, tenantId },
    });

    if (existing && existing.status !== OrderStatus.PENDING) {
      await this.finalizeIdempotency(tenantId, idempotencyKey, existing, requestId);
      return {
        orderId: existing.id,
        status: existing.status,
        rejectionReasonCode: existing.rejectionReasonCode ?? undefined,
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const campaign = await manager.findOne(CampaignEntity, {
        where: { id: campaignId, tenantId },
      });

      if (!campaign || campaign.productId !== productId) {
        return this.reject(
          manager,
          payload,
          RejectionReasonCode.CAMPAIGN_INACTIVE,
          payload.orderId,
        );
      }

      const validation = this.campaignValidation.validateActive(campaign);
      if (!validation.valid) {
        return this.reject(
          manager,
          payload,
          RejectionReasonCode.CAMPAIGN_INACTIVE,
          payload.orderId,
        );
      }

      if (campaign.maxPerUser !== null) {
        const userTotal = await manager
          .createQueryBuilder(OrderEntity, 'o')
          .select('COALESCE(SUM(o.quantity), 0)', 'total')
          .where('o.tenant_id = :tenantId', { tenantId })
          .andWhere('o.campaign_id = :campaignId', { campaignId })
          .andWhere('o.user_id = :userId', { userId })
          .andWhere('o.status = :status', { status: OrderStatus.CONFIRMED })
          .getRawOne<{ total: string }>();

        const confirmedQty = parseInt(userTotal?.total ?? '0', 10);
        if (confirmedQty + quantity > campaign.maxPerUser) {
          return this.reject(
            manager,
            payload,
            RejectionReasonCode.LIMIT_EXCEEDED,
            payload.orderId,
          );
        }
      }

      const product = await manager.findOne(ProductEntity, {
        where: { id: productId, tenantId },
        lock: { mode: 'pessimistic_read' },
      });

      if (!product) {
        return this.reject(
          manager,
          payload,
          RejectionReasonCode.OUT_OF_STOCK,
          payload.orderId,
        );
      }

      const deduction = await this.stockDeduction.deductAtomic(
        manager,
        tenantId,
        productId,
        quantity,
      );

      if (!deduction.success) {
        return this.reject(
          manager,
          payload,
          RejectionReasonCode.OUT_OF_STOCK,
          payload.orderId,
        );
      }

      let order: OrderEntity;
      if (existing) {
        existing.status = OrderStatus.CONFIRMED;
        existing.rejectionReasonCode = null;
        order = await manager.save(OrderEntity, existing);
      } else {
        order = manager.create(OrderEntity, {
          id: uuidv4(),
          tenantId,
          campaignId,
          productId,
          userId,
          quantity,
          status: OrderStatus.CONFIRMED,
          idempotencyKey,
          rejectionReasonCode: null,
        });
        order = await manager.save(OrderEntity, order);
      }

      await this.finalizeIdempotency(
        tenantId,
        idempotencyKey,
        order,
        requestId,
      );

      this.logger.info({
        orderId: order.id,
        tenantId,
        status: OrderStatus.CONFIRMED,
        requestId,
      });

      return { orderId: order.id, status: OrderStatus.CONFIRMED };
    });
  }

  private async reject(
    manager: EntityManager,
    payload: PlaceOrderJobPayload,
    reason: RejectionReasonCode,
    existingOrderId?: string,
  ): Promise<ProcessOrderResult> {
    const { tenantId, idempotencyKey, requestId } = payload;

    this.metrics.recordRejection(reason);

    let order: OrderEntity;
    if (existingOrderId) {
      const existing = await manager.findOne(OrderEntity, {
        where: { id: existingOrderId, tenantId },
      });
      if (existing) {
        existing.status = OrderStatus.REJECTED;
        existing.rejectionReasonCode = reason;
        order = await manager.save(OrderEntity, existing);
      } else {
        order = await this.createRejectedOrder(manager, payload, reason);
      }
    } else {
      order = await this.createRejectedOrder(manager, payload, reason);
    }

    await this.finalizeIdempotency(tenantId, idempotencyKey, order, requestId);

    this.logger.warn({
      orderId: order.id,
      tenantId,
      status: OrderStatus.REJECTED,
      reason,
      requestId,
    });

    return {
      orderId: order.id,
      status: OrderStatus.REJECTED,
      rejectionReasonCode: reason,
    };
  }

  private async createRejectedOrder(
    manager: EntityManager,
    payload: PlaceOrderJobPayload,
    reason: RejectionReasonCode,
  ): Promise<OrderEntity> {
    const order = manager.create(OrderEntity, {
      id: uuidv4(),
      tenantId: payload.tenantId,
      campaignId: payload.campaignId,
      productId: payload.productId,
      userId: payload.userId,
      quantity: payload.quantity,
      status: OrderStatus.REJECTED,
      idempotencyKey: payload.idempotencyKey,
      rejectionReasonCode: reason,
    });
    return manager.save(OrderEntity, order);
  }

  private async finalizeIdempotency(
    tenantId: string,
    key: string,
    order: OrderEntity,
    requestId: string,
  ): Promise<void> {
    await this.idempotency.updateFinal(tenantId, key, {
      request_id: requestId,
      status: order.status,
      order_id: order.id,
      ...(order.rejectionReasonCode
        ? { rejection_reason_code: order.rejectionReasonCode }
        : {}),
    });
  }
}
