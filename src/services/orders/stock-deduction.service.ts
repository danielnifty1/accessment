import { EntityManager } from 'typeorm';
import { ProductEntity } from '@/database/entities/product.entity';

export interface StockDeductionResult {
  success: boolean;
  remainingStock?: number;
}

export class StockDeductionService {
  async deductAtomic(
    manager: EntityManager,
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<StockDeductionResult> {
    const result = await manager
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :productId', { productId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('stock >= :quantity', { quantity })
      .execute();

    if (!result.affected || result.affected === 0) {
      return { success: false };
    }

    const product = await manager.findOne(ProductEntity, {
      where: { id: productId, tenantId },
      select: ['stock'],
    });

    return {
      success: true,
      remainingStock: product?.stock,
    };
  }
}
