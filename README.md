# Flash Sale Inventory & Orders

Production-grade multi-tenant flash sale system built with **Node.js**, **Express**, **TypeORM**, **MySQL**, **Redis**, and **BullMQ**. Designed for 10,000+ concurrent purchase attempts with overselling prevention, Redis idempotency, and async order processing.

## Quick start (Docker)

```bash
docker-compose up --build
```

Services:

| Service | Port | Role |
|---------|------|------|
| API | 3000 | Fast HTTP layer — enqueue only |
| Worker | — | Processes orders, stock deduction |
| MySQL | 3307 (host) → 3306 (container) | Source of truth |
| Redis | 6379 | Idempotency, queue, cache |

Migrations run automatically when the API container starts.

### Health & metrics

```bash
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## Local development (without Docker)

1. Start MySQL 8 and Redis 7 locally.
2. Copy environment file:

```bash
cp .env.example .env
```

3. Install and migrate:

```bash
npm install
npm run build
node dist/database/run-migrations.js
```

4. Run API and worker in separate terminals:

```bash
npm run start:dev
npm run start:worker:dev
```

API and worker are separate Node processes (no NestJS):

```
src/main.ts    → Express HTTP API
src/worker.ts  → BullMQ consumer
```

## API usage

All tenant-scoped routes require:

```
X-Tenant-Id: <tenant-id>
```

Order placement also requires:

```
Idempotency-Key: <unique-key-per-logical-request>
```

### Create product

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{"sku":"FLASH-001","name":"Sneakers","price":"99.99","stock":50}'
```

### Create campaign

```bash
curl -X POST http://localhost:3000/campaigns \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "product_id": "<product-uuid>",
    "start_time": "2026-05-16T00:00:00.000Z",
    "end_time": "2026-05-17T00:00:00.000Z",
    "max_per_user": 2
  }'
```

### Place order (async)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "Idempotency-Key: order-attempt-001" \
  -d '{
    "campaign_id": "<campaign-uuid>",
    "product_id": "<product-uuid>",
    "user_id": "user-42",
    "quantity": 1
  }'
```

Immediate response:

```json
{
  "request_id": "...",
  "status": "PENDING"
}
```

Poll order status:

```bash
curl http://localhost:3000/orders/<order-id> \
  -H "X-Tenant-Id: demo-tenant"
```

### List orders (cursor pagination)

```bash
curl "http://localhost:3000/orders?status=CONFIRMED&limit=20" \
  -H "X-Tenant-Id: demo-tenant"
```

## Error format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "...",
  "request_id": "..."
}
```

## Testing

```bash
npm test
npm run test:integration
```

Integration tests require MySQL and Redis (e.g. via `docker-compose up mysql redis`).

## Project structure

```
src/
  main.ts, worker.ts, app.ts, container.ts
  routes/             # Express routers
  services/           # Business logic
  middleware/         # tenant, validation, errors, metrics
  database/           # TypeORM entities, migrations
  schemas/            # Zod request validation
  queue/              # Job types
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for concurrency design and scaling notes.
