import { DataSource } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CampaignEntity } from './entities/campaign.entity';
import { OrderEntity } from './entities/order.entity';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'flashsale',
  password: process.env.DB_PASSWORD ?? 'flashsale_secret',
  database: process.env.DB_DATABASE ?? 'flashsale',
  entities: [ProductEntity, CampaignEntity, OrderEntity],
  migrations: [InitialSchema1730000000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
