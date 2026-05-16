export interface PlaceOrderJobPayload {
  tenantId: string;
  campaignId: string;
  productId: string;
  userId: string;
  quantity: number;
  idempotencyKey: string;
  requestId: string;
  orderId: string;
}

export const ORDER_QUEUE_NAME = 'orders';
