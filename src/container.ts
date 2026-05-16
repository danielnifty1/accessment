import 'reflect-metadata';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { getConfig, AppConfig } from './config/configuration';
import { AppDataSource } from './database/data-source';
import { OrderEntity } from './database/entities/order.entity';
import { ProductEntity } from './database/entities/product.entity';
import { CampaignEntity } from './database/entities/campaign.entity';
import { TenantContextService } from './common/tenant/tenant-context.service';
import { MetricsService } from './common/metrics/metrics.service';
import { IdempotencyService } from './services/orders/idempotency.service';
import { StockDeductionService } from './services/orders/stock-deduction.service';
import { CampaignValidationService } from './services/orders/campaign-validation.service';
import { OrderProcessingService } from './services/orders/order-processing.service';
import { OrdersService } from './services/orders/orders.service';
import { ProductsService } from './services/products/products.service';
import { CampaignsService } from './services/campaigns/campaigns.service';
import { PlaceOrderJobPayload } from './queue/order-job.types';

export interface AppContainer {
  config: AppConfig;
  dataSource: DataSource;
  redis: Redis;
  orderQueue: Queue<PlaceOrderJobPayload>;
  tenantContext: TenantContextService;
  metrics: MetricsService;
  ordersService: OrdersService;
  orderProcessingService: OrderProcessingService;
  productsService: ProductsService;
  campaignsService: CampaignsService;
}

export async function createContainer(): Promise<AppContainer> {
  const config = getConfig();

  const dataSource = await AppDataSource.initialize();

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });

  const orderQueue = new Queue<PlaceOrderJobPayload>(config.bullmq.orderQueue, {
    connection: { host: config.redis.host, port: config.redis.port },
  });

  const tenantContext = new TenantContextService();
  const metrics = new MetricsService();
  const idempotency = new IdempotencyService(
    redis,
    config.idempotencyTtlSeconds,
  );
  const stockDeduction = new StockDeductionService();
  const campaignValidation = new CampaignValidationService();

  const orderRepo = dataSource.getRepository(OrderEntity);
  const productRepo = dataSource.getRepository(ProductEntity);
  const campaignRepo = dataSource.getRepository(CampaignEntity);

  const orderProcessingService = new OrderProcessingService(
    dataSource,
    orderRepo,
    stockDeduction,
    campaignValidation,
    idempotency,
    metrics,
  );

  const ordersService = new OrdersService(
    orderRepo,
    orderQueue,
    tenantContext,
    idempotency,
  );

  const productsService = new ProductsService(productRepo, tenantContext);
  const campaignsService = new CampaignsService(
    campaignRepo,
    productRepo,
    tenantContext,
  );

  return {
    config,
    dataSource,
    redis,
    orderQueue,
    tenantContext,
    metrics,
    ordersService,
    orderProcessingService,
    productsService,
    campaignsService,
  };
}

export async function shutdownContainer(container: AppContainer): Promise<void> {
  await container.orderQueue.close();
  await container.redis.quit();
  if (container.dataSource.isInitialized) {
    await container.dataSource.destroy();
  }
}
