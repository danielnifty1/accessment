import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('flash_sale_campaigns')
@Index(['tenantId'])
@Index(['tenantId', 'productId'])
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  productId!: string;

  @Column({ name: 'start_time', type: 'datetime' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'datetime' })
  endTime!: Date;

  @Column({ name: 'max_per_user', type: 'int', unsigned: true, nullable: true })
  maxPerUser!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
