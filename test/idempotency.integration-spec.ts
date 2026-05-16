import Redis from 'ioredis';
import { IdempotencyService } from '../src/services/orders/idempotency.service';

describe('Idempotency duplicate request (integration)', () => {
  let redis: Redis;
  let service: IdempotencyService;

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
    try {
      await redis.ping();
    } catch {
      return;
    }
    service = new IdempotencyService(redis, 60);
  });

  afterAll(async () => {
    if (redis?.status === 'ready') {
      await redis.del('tenant:dup-tenant:idem:dup-key');
      await redis.quit();
    }
  });

  it('second claim returns exists for duplicate idempotency key', async () => {
    if (!redis || redis.status !== 'ready') {
      console.warn('Skipping — Redis not available');
      return;
    }

    const tenantId = 'dup-tenant';
    const key = 'dup-key';
    await redis.del(`tenant:${tenantId}:idem:${key}`);

    const first = await service.tryClaimEnqueue(tenantId, key, {
      request_id: 'req-1',
      status: 'PENDING',
    });
    expect(first).toBe('claimed');

    const second = await service.tryClaimEnqueue(tenantId, key, {
      request_id: 'req-2',
      status: 'PENDING',
    });
    expect(second).toBe('exists');

    const cached = await service.getCached(tenantId, key);
    expect(cached?.request_id).toBe('req-1');
  });
});
