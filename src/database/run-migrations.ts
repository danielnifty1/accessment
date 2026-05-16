import { AppDataSource } from './data-source';

async function runMigrations(): Promise<void> {
  const dataSource = await AppDataSource.initialize();
  const pending = await dataSource.showMigrations();
  if (pending) {
    await dataSource.runMigrations();
    console.log('Migrations completed');
  } else {
    console.log('No pending migrations');
  }
  await dataSource.destroy();
}

runMigrations().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
