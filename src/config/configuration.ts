export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  redis: { host: string; port: number };
  idempotencyTtlSeconds: number;
  bullmq: { orderQueue: string };
  logLevel: string;
}

export function getConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USERNAME ?? 'flashsale',
      password: process.env.DB_PASSWORD ?? 'flashsale_secret',
      database: process.env.DB_DATABASE ?? 'flashsale',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    idempotencyTtlSeconds: parseInt(
      process.env.IDEMPOTENCY_TTL_SECONDS ?? '86400',
      10,
    ),
    bullmq: {
      orderQueue: process.env.BULLMQ_ORDER_QUEUE ?? 'orders',
    },
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
