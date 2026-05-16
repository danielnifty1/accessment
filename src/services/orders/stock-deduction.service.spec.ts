import { StockDeductionService } from './stock-deduction.service';
import { ProductEntity } from '@/database/entities/product.entity';

describe('StockDeductionService', () => {
  let service: StockDeductionService;
  let mockManager: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    service = new StockDeductionService();
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };
    mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
    };
  });

  it('returns success when atomic update affects a row', async () => {
    const qb = mockManager.createQueryBuilder();
    qb.execute.mockResolvedValue({ affected: 1 });
    mockManager.findOne.mockResolvedValue({ stock: 5 } as ProductEntity);

    const result = await service.deductAtomic(
      mockManager as never,
      'tenant-1',
      'product-1',
      2,
    );

    expect(result.success).toBe(true);
    expect(result.remainingStock).toBe(5);
    expect(qb.andWhere).toHaveBeenCalledWith('stock >= :quantity', {
      quantity: 2,
    });
  });

  it('returns failure when stock is insufficient', async () => {
    const qb = mockManager.createQueryBuilder();
    qb.execute.mockResolvedValue({ affected: 0 });

    const result = await service.deductAtomic(
      mockManager as never,
      'tenant-1',
      'product-1',
      100,
    );

    expect(result.success).toBe(false);
    expect(result.remainingStock).toBeUndefined();
  });
});
