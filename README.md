# Flash Sale Inventory & Orders

Production-grade multi-tenant flash sale system built with **Node.js**, **Express**, **TypeORM**, **MySQL**, **Redis**, and **BullMQ**.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended), **or**
- Node.js 20+, MySQL 8, Redis 7

---

## Run with Docker (recommended)

### Start all services and watch logs

```bash
cd c:\Users\user\accessment
docker-compose up --build
```

Keep this terminal open. You will see logs from **api**, **worker**, **mysql**, and **redis**. Every HTTP request is logged on the **api** service (method, URL, status, `request_id`, `tenant_id`).

### Start in background, follow API logs only

```bash
docker-compose up --build -d
docker-compose logs -f api
```

### Stop

```bash
docker-compose down
```

### Services and ports

| Service | URL / port | Role |
|---------|------------|------|
| **API** | http://localhost:3000 | HTTP + Swagger |
| **Swagger UI** | http://localhost:3000/api-docs | Interactive API docs |
| **OpenAPI JSON** | http://localhost:3000/api-docs/openapi.json | Raw spec |
| **Worker** | (no HTTP port) | Processes orders, deducts stock |
| **MySQL** | `localhost:3307` (host) | Database |
| **Redis** | `localhost:6379` | Idempotency + queue |

Migrations run automatically when the API container starts.

### Verify

```bash
curl http://localhost:3000/health
```

Expected: `"status":"ok"` with `database` and `redis` true.

---

## Swagger / OpenAPI

With the API running, open:

**http://localhost:3000/api-docs**

1. Click **Authorize** (optional) — set `X-Tenant-Id` to e.g. `demo-tenant`.
2. Try **GET /health** (no tenant header required).
3. Create flow: **POST /products** → **POST /campaigns** → **POST /orders** (add `Idempotency-Key` header on orders).
4. Poll **GET /orders** or **GET /orders/{id}** until status is `CONFIRMED` or `REJECTED` (worker must be running).

For **POST /orders**, use header:

```
Idempotency-Key: order-attempt-001
```

Tenant-scoped routes require:

```
X-Tenant-Id: demo-tenant
```

Import into Postman: **Import** → `http://localhost:3000/api-docs/openapi.json`

---

## Run locally (without Docker)

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env` if MySQL/Redis are not on `localhost` (defaults: MySQL `3306`, Redis `6379`).

### 2. Install, build, migrate

```bash
npm install
npm run build
node dist/database/run-migrations.js
```

### 3. Start API and worker (two terminals)

**Terminal 1 — API:**

```bash
npm run start:dev
```

**Terminal 2 — worker (required for order processing):**

```bash
npm run start:worker:dev
```

Startup log includes `port`, `url`, `health`, and `swagger` URLs.

### 4. Open Swagger

http://localhost:3000/api-docs

---

## API usage (curl)

All tenant routes need `X-Tenant-Id`. Orders also need `Idempotency-Key`.

### Create product

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -d "{\"sku\":\"FLASH-001\",\"name\":\"Sneakers\",\"price\":\"99.99\",\"stock\":50}"
```

### Create campaign

```bash
curl -X POST http://localhost:3000/campaigns \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -d "{\"product_id\":\"<product-uuid>\",\"start_time\":\"2026-01-01T00:00:00.000Z\",\"end_time\":\"2027-12-31T23:59:59.000Z\",\"max_per_user\":2}"
```

### Place order (async, returns PENDING)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "Idempotency-Key: order-attempt-001" \
  -d "{\"campaign_id\":\"<campaign-uuid>\",\"product_id\":\"<product-uuid>\",\"user_id\":\"user-42\",\"quantity\":1}"
```

### List / get orders

```bash
curl "http://localhost:3000/orders?limit=20" -H "X-Tenant-Id: demo-tenant"
curl http://localhost:3000/orders/<order-id> -H "X-Tenant-Id: demo-tenant"
```

---

## API response format

All endpoints use a standard envelope from `src/lib/api-response.ts`.

**Success:**

```json
{
  "success": true,
  "request_id": "uuid",
  "data": { },
  "meta": { "next_cursor": "..." }
}
```

`meta` is optional (e.g. cursor pagination on `GET /orders`).

**Error:**

```json
{
  "success": false,
  "request_id": "uuid",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

Helpers: `sendSuccess`, `sendCreated`, `sendAccepted`, `sendError`, `buildSuccessBody`, `buildErrorBody`.

---

## Testing

```bash
npm test
npm run test:integration
```

Integration tests need MySQL and Redis (e.g. `docker-compose up -d mysql redis`).

---

## Project structure

```
src/
  main.ts, worker.ts, app.ts, container.ts
  routes/             # Express routers
  services/           # Business logic
  middleware/         # tenant, validation, logging, errors
  swagger/            # OpenAPI spec + Swagger UI
  database/           # TypeORM entities, migrations
  schemas/            # Zod validation
  queue/              # BullMQ job types
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for concurrency design and scaling notes.
