# AI Usage Disclosure

## Tools used

- **Cursor Agent** (Composer) for end-to-end implementation, architecture documentation, Docker setup, tests, and iterative fixes.
- Migrated from NestJS to **Express + TypeORM** on request.

## Generated vs modified

| Area | Status |
|------|--------|
| Project scaffold (NestJS, TypeORM, BullMQ, Redis) | Generated |
| Domain entities & migrations | Generated |
| Orders API + worker split | Generated |
| Stock deduction & idempotency services | Generated |
| Docker Compose & Dockerfile | Generated |
| Unit & integration tests | Generated |
| README, ARCHITECTURE.md, AI_USAGE.md | Generated |

No prior codebase existed in the workspace; this was a greenfield build.

## Prompt strategy summary

1. **Requirements-first** — mapped each non-negotiable goal (oversell prevention, idempotency, async worker, tenant isolation) to a concrete component before coding.
2. **Separate hot paths** — API returns `PENDING` immediately; worker owns inventory mutation.
3. **Choose one concurrency primitive** — atomic `UPDATE … WHERE stock >= qty` documented with trade-offs vs pessimistic locking.
4. **Production defaults** — no `synchronize: true`, structured errors, migrations, health/metrics endpoints.
5. **Verify** — unit tests for pure logic; integration tests for Redis idempotency and concurrent deduction (when infra available).

## Statement

**I can explain and defend every architectural and implementation decision in this solution.**

Key defensible choices:

- **Atomic conditional UPDATE** for stock — correctness without long pessimistic locks.
- **Redis idempotency** before enqueue — fast replays, duplicate job prevention via BullMQ `jobId`.
- **BullMQ worker separation** — API stays fast under burst traffic.
- **Tenant from header + AsyncLocalStorage** — never trust body `tenant_id`.
- **DECIMAL(12,2)** for money — no floating point.
- **Cursor pagination** on `(created_at DESC, id DESC)` — stable under concurrent inserts.
