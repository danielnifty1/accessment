import { Router } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';

export function createHealthRouter(container: AppContainer): Router {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      let dbOk = false;
      let redisOk = false;

      try {
        await container.dataSource.query('SELECT 1');
        dbOk = true;
      } catch {
        dbOk = false;
      }

      try {
        const pong = await container.redis.ping();
        redisOk = pong === 'PONG';
      } catch {
        redisOk = false;
      }

      res.json({
        status: dbOk && redisOk ? 'ok' : 'degraded',
        checks: { database: dbOk, redis: redisOk },
      });
    }),
  );

  router.get('/metrics', (_req, res) => {
    res.json(container.metrics.getSnapshot());
  });

  return router;
}
