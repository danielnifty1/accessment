export const REDIS_CLIENT = 'REDIS_CLIENT';

export function idempotencyKey(tenantId: string, key: string): string {
  return `tenant:${tenantId}:idem:${key}`;
}

export function idempotencyLockKey(tenantId: string, key: string): string {
  return `tenant:${tenantId}:idem:lock:${key}`;
}
