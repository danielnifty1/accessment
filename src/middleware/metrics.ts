import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '@/common/metrics/metrics.service';

export function metricsMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    metrics.incrementRequestCount();

    res.on('finish', () => {
      metrics.recordLatencyMs(Date.now() - start);
    });

    next();
  };
}
