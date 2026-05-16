import Redis from 'ioredis';
import { idempotencyKey, idempotencyLockKey } from '@/common/redis/redis.constants';

export interface IdempotencyCachedResponse {
  request_id: string;
  status: string;
  order_id?: string;
  rejection_reason_code?: string;
}

export class IdempotencyService {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async getCached(
    tenantId: string,
    key: string,
  ): Promise<IdempotencyCachedResponse | null> {
    const raw = await this.redis.get(idempotencyKey(tenantId, key));
    if (!raw) return null;
    return JSON.parse(raw) as IdempotencyCachedResponse;
  }

  async setCached(
    tenantId: string,
    key: string,
    response: IdempotencyCachedResponse,
  ): Promise<void> {
    await this.redis.set(
      idempotencyKey(tenantId, key),
      JSON.stringify(response),
      'EX',
      this.ttlSeconds,
    );
  }

  async tryClaimEnqueue(
    tenantId: string,
    key: string,
    pendingResponse: IdempotencyCachedResponse,
  ): Promise<'claimed' | 'exists' | 'contended'> {
    const lockKey = idempotencyLockKey(tenantId, key);
    const mainKey = idempotencyKey(tenantId, key);

    const existing = await this.redis.get(mainKey);
    if (existing) return 'exists';

    const acquired = await this.redis.set(lockKey, '1', 'EX', 30, 'NX');
    if (!acquired) return 'contended';

    try {
      const doubleCheck = await this.redis.get(mainKey);
      if (doubleCheck) return 'exists';

      await this.redis.set(
        mainKey,
        JSON.stringify(pendingResponse),
        'EX',
        this.ttlSeconds,
      );
      return 'claimed';
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async updateFinal(
    tenantId: string,
    key: string,
    response: IdempotencyCachedResponse,
  ): Promise<void> {
    await this.setCached(tenantId, key, response);
  }
}
