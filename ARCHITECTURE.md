# Architecture

## Overview

```
Client
  │
  ▼
API (Express) ──► Redis idempotency check/claim
  │                    │
  │                    └── cached hit → immediate response
  ▼
BullMQ (Redis) ──► Worker(s)
                      │
                      ▼
                 MySQL transaction
                 - validate campaign
                 - enforce max_per_user
                 - atomic stock UPDATE
                 - update order status
                 - finalize Redis idempotency cache
```

The API never deducts stock. It only validates input, enforces tenant context, manages idempotency, enqueues work, and returns `PENDING` immediately.

## Concurrency strategy: atomic conditional UPDATE

**Chosen approach:** single-statement atomic update:

```sql
UPDATE products
SET stock = stock - :qty
WHERE id = :productId
  AND tenant_id = :tenantId
  AND stock >= :qty;
```

`affected rows = 0` means insufficient stock — no oversell is possible.

### Why not only `SELECT … FOR UPDATE`?

Pessimistic row locks serialize all buyers on one product row. Under 10k concurrent attempts, lock wait timeouts and throughput collapse are likely. The conditional `UPDATE` is:

- **Correct:** MySQL applies the row update atomically; `stock >= qty` is evaluated on the current row value.
- **Fast:** no long-held locks in the application layer; failed attempts fail in one round trip.
- **Horizontally scalable:** multiple workers can contend safely; the database is the arbiter.

We still wrap order status transitions, limit checks, and the deduction in a **single DB transaction** so order rows and inventory stay consistent.

### Why not Redis lock + DB?

Adds coordination complexity and split-brain risk if Redis fails between lock acquire and commit. Redis remains responsible for **idempotency** and **queueing**, not inventory truth.

## Idempotency (Redis)

Key format: `tenant:{tenantId}:idem:{key}`

| Phase | Behavior |
|-------|----------|
| API read | If key exists → return cached JSON immediately |
| API claim | Short-lived lock + `SET` pending payload (24h TTL) |
| Worker complete | `SET` final payload (`CONFIRMED` / `REJECTED` + `order_id`) |

`jobId = {tenantId}:{idempotencyKey}` prevents duplicate BullMQ jobs for the same logical request.

## Tenant isolation

- `X-Tenant-Id` is required on tenant routes (production: replace with JWT claims).
- `TenantContextService` (AsyncLocalStorage) propagates tenant per request.
- Every repository query includes `tenant_id` from context — never from request body.

## Order status machine

| Status | Meaning |
|--------|---------|
| `PENDING` | Accepted, queued |
| `CONFIRMED` | Stock deducted, limits satisfied |
| `REJECTED` | Failed with `rejection_reason_code` |

Reason codes: `OUT_OF_STOCK`, `CAMPAIGN_INACTIVE`, `LIMIT_EXCEEDED`, `DUPLICATE_ORDER`.

Campaign window: `start_time` inclusive, `end_time` exclusive (UTC).

## Scaling strategy

### Horizontal API servers

- Stateless; scale behind a load balancer.
- Shared Redis + MySQL + BullMQ.

### Multiple workers

- BullMQ distributes jobs across consumers.
- Stock correctness does not depend on worker count — DB atomic update is the gate.

### Redis as mitigation layer

- Absorbs idempotent replay traffic without hitting MySQL.
- Queue decouples spike traffic from DB write rate.

### DB write contention

- Hot SKU rows are the bottleneck.
- Mitigations: shard inventory per SKU partition, pre-allocated stock pools, or read replicas for queries (writes stay on primary).

## Bottlenecks

1. **Single product row** — all deductions serialize on one InnoDB row.
2. **MySQL primary** — order inserts + stock updates.
3. **Redis** — usually ample; monitor memory for idempotency TTL volume.
4. **Queue depth** — backlog increases latency to `CONFIRMED`; scale workers.

## Failure modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Redis down | Cannot idempotently accept new orders | Fail fast; circuit breaker; degrade only if business accepts duplicate risk |
| DB crash | Orders stuck `PENDING` | Retry jobs; reconciliation job marks stale `PENDING` |
| Queue backlog | Higher time-to-confirm | Scale workers; rate limit ingress |
| Worker crash mid-transaction | Transaction rolls back; job retries | BullMQ retries with exponential backoff |
| API crash after enqueue | Client may retry with same idempotency key | Redis returns cached `PENDING` or final state |

## Observability

- **Pino** structured logging with `request_id`
- **`/health`** — DB + Redis probes
- **`/metrics`** — request count, rejection histogram, p95 latency estimate

## Migrations

TypeORM migrations only (`synchronize: false`). Indexes:

- `tenant_id` on all tenant tables
- unique `(tenant_id, idempotency_key)` on orders
- `(campaign_id, product_id)`, `(tenant_id, created_at)` for queries
