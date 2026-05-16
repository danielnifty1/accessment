import express, { Express } from 'express';
import pinoHttp from 'pino-http';
import { AppContainer } from './container';
import { requestContextMiddleware } from './middleware/request-context';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler } from './middleware/error-handler';
import { createHealthRouter } from './routes/health.routes';
import { createProductsRouter } from './routes/products.routes';
import { createCampaignsRouter } from './routes/campaigns.routes';
import { createOrdersRouter } from './routes/orders.routes';

export function createApp(container: AppContainer): Express {
  const app = express();

  app.use(
    pinoHttp({
      level: container.config.logLevel,
      transport:
        container.config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    }),
  );

  app.use(express.json());
  app.use(requestContextMiddleware(container.tenantContext));
  app.use(metricsMiddleware(container.metrics));

  app.use(createHealthRouter(container));
  app.use('/products', createProductsRouter(container));
  app.use('/campaigns', createCampaignsRouter(container));
  app.use('/orders', createOrdersRouter(container));

  app.use(errorHandler);

  return app;
}
