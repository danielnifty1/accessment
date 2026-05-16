import { z } from 'zod';

export const createCampaignSchema = z.object({
  product_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  max_per_user: z.number().int().positive().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
