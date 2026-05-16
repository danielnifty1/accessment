import express, { Express } from 'express';
import { AppContainer } from './container';
import { requestContextMiddleware } from './middleware/request-context';
import { createHttpLogger } from './middleware/http-logger';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler } from './middleware/error-handler';
import { createHealthRouter } from './routes/health.routes';
import { createProductsRouter } from './routes/products.routes';
import { createCampaignsRouter } from './routes/campaigns.routes';
import { createOrdersRouter } from './routes/orders.routes';

export function createApp(container: AppContainer): Express {
  const app = express();

  app.use(express.json());
  app.use(requestContextMiddleware(container.tenantContext));
  app.use(createHttpLogger(container.config));
  app.use(metricsMiddleware(container.metrics));

  app.use(createHealthRouter(container));
  app.use('/products', createProductsRouter(container));
  app.use('/campaigns', createCampaignsRouter(container));
  app.use('/orders', createOrdersRouter(container));

  app.use(errorHandler);

  return app;
}
