import { CampaignEntity } from '@/database/entities/campaign.entity';

export type CampaignValidationResult =
  | { valid: true; campaign: CampaignEntity }
  | { valid: false; reason: 'CAMPAIGN_INACTIVE' | 'NOT_FOUND' };

export class CampaignValidationService {
  validateActive(
    campaign: CampaignEntity,
    now: Date = new Date(),
  ): CampaignValidationResult {
    if (!campaign) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    const start = campaign.startTime.getTime();
    const end = campaign.endTime.getTime();
    const ts = now.getTime();

    if (ts < start || ts >= end) {
      return { valid: false, reason: 'CAMPAIGN_INACTIVE' };
    }

    return { valid: true, campaign };
  }
}
