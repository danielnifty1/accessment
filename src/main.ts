import 'reflect-metadata';
import pino from 'pino';
import { createContainer, shutdownContainer } from './container';
import { createApp } from './app';

const logger = pino({ name: 'api' });

async function bootstrap(): Promise<void> {
  const container = await createContainer();
  const app = createApp(container);
  const { port, nodeEnv } = container.config;

  const server = app.listen(port, () => {
    logger.info(
      {
        port,
        env: nodeEnv,
        url: `http://localhost:${port}`,
        health: `http://localhost:${port}/health`,
      },
      `API listening on port ${port}`,
    );
  });

  const shutdown = async () => {
    server.close();
    await shutdownContainer(container);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start API');
  process.exit(1);
});
