import { Router } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';
import { sendCreated, sendSuccess } from '@/lib/api-response';
import { requireTenant } from '@/middleware/tenant';
import { validateBody } from '@/middleware/validate';
import { createCampaignSchema } from '@/schemas/campaign.schema';
import { CampaignEntity } from '@/database/entities/campaign.entity';

function toDto(campaign: CampaignEntity) {
  return {
    id: campaign.id,
    tenant_id: campaign.tenantId,
    product_id: campaign.productId,
    start_time: campaign.startTime.toISOString(),
    end_time: campaign.endTime.toISOString(),
    max_per_user: campaign.maxPerUser,
    created_at: campaign.createdAt.toISOString(),
    updated_at: campaign.updatedAt.toISOString(),
  };
}

export function createCampaignsRouter(container: AppContainer): Router {
  const router = Router();
  const { campaignsService } = container;

  router.use(requireTenant);

  router.post(
    '/',
    validateBody(createCampaignSchema),
    asyncHandler(async (req, res) => {
      const campaign = await campaignsService.create(req.body);
      sendCreated(res, req, toDto(campaign));
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const campaigns = await campaignsService.list();
      sendSuccess(res, req, campaigns.map(toDto));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const campaign = await campaignsService.findById(String(req.params.id));
      sendSuccess(res, req, toDto(campaign));
    }),
  );

  return router;
}
