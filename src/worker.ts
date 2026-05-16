import 'reflect-metadata';
import { Worker } from 'bullmq';
import pino from 'pino';
import { createContainer, shutdownContainer } from './container';
import { PlaceOrderJobPayload } from './queue/order-job.types';

const logger = pino({ name: 'worker' });

async function bootstrap(): Promise<void> {
  const container = await createContainer();

  const worker = new Worker<PlaceOrderJobPayload>(
    container.config.bullmq.orderQueue,
    async (job) => {
      logger.info({
        jobId: job.id,
        orderId: job.data.orderId,
        tenantId: job.data.tenantId,
      });
      await container.orderProcessingService.processOrder(job.data);
    },
    {
      connection: {
        host: container.config.redis.host,
        port: container.config.redis.port,
      },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job failed');
  });

  logger.info('Order worker started — consuming BullMQ jobs');

  const shutdown = async () => {
    await worker.close();
    await shutdownContainer(container);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start worker');
  process.exit(1);
});
