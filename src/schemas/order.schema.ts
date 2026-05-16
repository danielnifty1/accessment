import { z } from 'zod';
import { OrderStatus } from '@/database/entities/order.entity';

export const createOrderSchema = z.object({
  campaign_id: z.string().uuid(),
  product_id: z.string().uuid(),
  user_id: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(100),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
