import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CampaignEntity } from '@/database/entities/campaign.entity';
import { ProductEntity } from '@/database/entities/product.entity';
import { TenantContextService } from '@/common/tenant/tenant-context.service';
import { CreateCampaignInput } from '@/schemas/campaign.schema';
import { badRequest, notFound } from '@/lib/errors';

export class CampaignsService {
  constructor(
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly productRepo: Repository<ProductEntity>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateCampaignInput): Promise<CampaignEntity> {
    const tenantId = this.tenantContext.getTenantId();
    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);

    if (endTime.getTime() <= startTime.getTime()) {
      throw badRequest(
        'INVALID_CAMPAIGN_WINDOW',
        'end_time must be after start_time',
      );
    }

    const product = await this.productRepo.findOne({
      where: { id: dto.product_id, tenantId },
    });
    if (!product) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found for tenant');
    }

    const campaign = this.campaignRepo.create({
      id: uuidv4(),
      tenantId,
      productId: dto.product_id,
      startTime,
      endTime,
      maxPerUser: dto.max_per_user ?? null,
    });
    return this.campaignRepo.save(campaign);
  }

  async findById(id: string): Promise<CampaignEntity> {
    const tenantId = this.tenantContext.getTenantId();
    const campaign = await this.campaignRepo.findOne({
      where: { id, tenantId },
    });
    if (!campaign) {
      throw notFound('CAMPAIGN_NOT_FOUND', 'Campaign not found');
    }
    return campaign;
  }

  async list(): Promise<CampaignEntity[]> {
    const tenantId = this.tenantContext.getTenantId();
    return this.campaignRepo.find({
      where: { tenantId },
      order: { startTime: 'DESC' },
    });
  }
}
