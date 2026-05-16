import { CampaignValidationService } from './campaign-validation.service';
import { CampaignEntity } from '@/database/entities/campaign.entity';

describe('CampaignValidationService', () => {
  const service = new CampaignValidationService();

  const baseCampaign = (): CampaignEntity =>
    ({
      id: 'c1',
      tenantId: 't1',
      productId: 'p1',
      startTime: new Date('2026-05-16T10:00:00.000Z'),
      endTime: new Date('2026-05-16T12:00:00.000Z'),
      maxPerUser: 2,
    }) as CampaignEntity;

  it('accepts time at start boundary (inclusive)', () => {
    const result = service.validateActive(
      baseCampaign(),
      new Date('2026-05-16T10:00:00.000Z'),
    );
    expect(result.valid).toBe(true);
  });

  it('rejects time at end boundary (exclusive)', () => {
    const result = service.validateActive(
      baseCampaign(),
      new Date('2026-05-16T12:00:00.000Z'),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('CAMPAIGN_INACTIVE');
    }
  });

  it('rejects time before start', () => {
    const result = service.validateActive(
      baseCampaign(),
      new Date('2026-05-16T09:59:59.999Z'),
    );
    expect(result.valid).toBe(false);
  });

  it('accepts time just before end', () => {
    const result = service.validateActive(
      baseCampaign(),
      new Date('2026-05-16T11:59:59.999Z'),
    );
    expect(result.valid).toBe(true);
  });
});
