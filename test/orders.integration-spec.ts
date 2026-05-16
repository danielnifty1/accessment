import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { StockDeductionService } from '../src/services/orders/stock-deduction.service';
import { ProductEntity } from '../src/database/entities/product.entity';

describe('Concurrent stock deduction (integration)', () => {
  let dataSource: DataSource;
  let stockService: StockDeductionService;
  const tenantId = 'integration-tenant';
  let productId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USERNAME ?? 'flashsale',
      password: process.env.DB_PASSWORD ?? 'flashsale_secret',
      database: process.env.DB_DATABASE ?? 'flashsale',
      entities: [ProductEntity],
      synchronize: false,
    });

    try {
      await dataSource.initialize();
    } catch {
      return;
    }

    stockService = new StockDeductionService();
    productId = uuidv4();

    await dataSource.query(
      `INSERT INTO products (id, tenant_id, sku, name, price, stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, tenantId, `SKU-${productId.slice(0, 8)}`, 'Test', '9.99', 10],
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query(`DELETE FROM products WHERE tenant_id = ?`, [
      tenantId,
    ]);
    await dataSource.destroy();
  });

  it('never oversells under concurrent deductions', async () => {
    if (!dataSource?.isInitialized) {
      console.warn('Skipping integration test — database not available');
      return;
    }

    const attempts = 50;
    const quantityPerOrder = 1;

    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        dataSource.transaction((manager) =>
          stockService.deductAtomic(
            manager,
            tenantId,
            productId,
            quantityPerOrder,
          ),
        ),
      ),
    );

    const successes = results.filter((r) => r.success).length;
    expect(successes).toBeLessThanOrEqual(10);

    const row = await dataSource.query(
      `SELECT stock FROM products WHERE id = ?`,
      [productId],
    );
    const stock = row[0].stock as number;
    expect(stock).toBeGreaterThanOrEqual(0);
    expect(stock).toBe(10 - successes);
  });
});
