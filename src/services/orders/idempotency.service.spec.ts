import { IdempotencyService } from './idempotency.service';
import Redis from 'ioredis';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let redis: jest.Mocked<Pick<Redis, 'get' | 'set' | 'del'>>;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new IdempotencyService(redis as unknown as Redis, 86400);
  });

  it('returns cached response when key exists', async () => {
    const cached = { request_id: 'r1', status: 'PENDING' };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.getCached('tenant-a', 'key-1');
    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('tenant:tenant-a:idem:key-1');
  });

  it('claims enqueue when no existing key', async () => {
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');

    const result = await service.tryClaimEnqueue('tenant-a', 'key-2', {
      request_id: 'r2',
      status: 'PENDING',
    });

    expect(result).toBe('claimed');
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns exists when key already present', async () => {
    redis.get.mockResolvedValue('{"status":"PENDING"}');

    const result = await service.tryClaimEnqueue('tenant-a', 'key-3', {
      request_id: 'r3',
      status: 'PENDING',
    });

    expect(result).toBe('exists');
  });
});
