import 'reflect-metadata';
import { createContainer, shutdownContainer } from './container';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  const container = await createContainer();
  const app = createApp(container);

  const server = app.listen(container.config.port, () => {
    console.log(`API listening on port ${container.config.port}`);
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
  console.error('Failed to start API', err);
  process.exit(1);
});
