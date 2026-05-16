import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id CHAR(36) NOT NULL PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        sku VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        stock INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_products_tenant_sku (tenant_id, sku),
        INDEX IDX_products_tenant_id (tenant_id),
        CONSTRAINT CHK_products_stock_non_negative CHECK (stock >= 0)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE flash_sale_campaigns (
        id CHAR(36) NOT NULL PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        start_time DATETIME(6) NOT NULL,
        end_time DATETIME(6) NOT NULL,
        max_per_user INT UNSIGNED NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_campaigns_tenant_id (tenant_id),
        INDEX IDX_campaigns_tenant_product (tenant_id, product_id),
        INDEX IDX_campaigns_product_id (product_id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id CHAR(36) NOT NULL PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        campaign_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        status ENUM('PENDING', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        idempotency_key VARCHAR(128) NOT NULL,
        rejection_reason_code ENUM('OUT_OF_STOCK', 'CAMPAIGN_INACTIVE', 'LIMIT_EXCEEDED', 'DUPLICATE_ORDER') NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_orders_tenant_idempotency (tenant_id, idempotency_key),
        INDEX IDX_orders_tenant_id (tenant_id),
        INDEX IDX_orders_tenant_created (tenant_id, created_at),
        INDEX IDX_orders_campaign_product (campaign_id, product_id),
        INDEX IDX_orders_user_campaign (tenant_id, user_id, campaign_id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS flash_sale_campaigns`);
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }
}
