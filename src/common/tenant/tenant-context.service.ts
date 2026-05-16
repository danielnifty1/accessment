import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
  requestId: string;
}

export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  getTenantId(): string {
    const store = this.storage.getStore();
    if (!store?.tenantId) {
      throw new Error('Tenant context not initialized');
    }
    return store.tenantId;
  }

  getRequestId(): string {
    const store = this.storage.getStore();
    return store?.requestId ?? 'unknown';
  }
}
