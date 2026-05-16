import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'price must be a valid decimal'),
  stock: z.number().int().min(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
