import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProductEntity } from '@/database/entities/product.entity';
import { TenantContextService } from '@/common/tenant/tenant-context.service';
import { CreateProductInput } from '@/schemas/product.schema';
import { conflict, notFound } from '@/lib/errors';

export class ProductsService {
  constructor(
    private readonly productRepo: Repository<ProductEntity>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateProductInput): Promise<ProductEntity> {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.productRepo.findOne({
      where: { tenantId, sku: dto.sku },
    });
    if (existing) {
      throw conflict('SKU_EXISTS', 'SKU already exists for this tenant');
    }

    const product = this.productRepo.create({
      id: uuidv4(),
      tenantId,
      sku: dto.sku,
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
    });
    return this.productRepo.save(product);
  }

  async findById(id: string): Promise<ProductEntity> {
    const tenantId = this.tenantContext.getTenantId();
    const product = await this.productRepo.findOne({
      where: { id, tenantId },
    });
    if (!product) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    return product;
  }

  async list(): Promise<ProductEntity[]> {
    const tenantId = this.tenantContext.getTenantId();
    return this.productRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
