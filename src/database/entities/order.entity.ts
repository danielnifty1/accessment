import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum RejectionReasonCode {
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  CAMPAIGN_INACTIVE = 'CAMPAIGN_INACTIVE',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
}

@Entity('orders')
@Unique(['tenantId', 'idempotencyKey'])
@Index(['tenantId'])
@Index(['tenantId', 'createdAt'])
@Index(['campaignId', 'productId'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'campaign_id', type: 'varchar', length: 36 })
  campaignId!: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  productId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 128 })
  userId!: string;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @Column({
    name: 'rejection_reason_code',
    type: 'enum',
    enum: RejectionReasonCode,
    nullable: true,
  })
  rejectionReasonCode!: RejectionReasonCode | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}
