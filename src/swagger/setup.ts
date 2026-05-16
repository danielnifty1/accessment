import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';

export function setupSwagger(app: Express, port: number): void {
  const document = {
    ...openApiDocument,
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Current host',
      },
    ],
  };

  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json(document);
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'Flash Sale API',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );
}
