import { Router } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';
import { sendSuccess } from '@/lib/api-response';

export function createHealthRouter(container: AppContainer): Router {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (req, res) => {
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

      sendSuccess(res, req, {
        status: dbOk && redisOk ? 'ok' : 'degraded',
        checks: { database: dbOk, redis: redisOk },
      });
    }),
  );

  router.get('/metrics', (req, res) => {
    sendSuccess(res, req, container.metrics.getSnapshot());
  });

  return router;
}
