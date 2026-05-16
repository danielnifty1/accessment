import { Router } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';
import { sendCreated, sendSuccess } from '@/lib/api-response';
import { requireTenant } from '@/middleware/tenant';
import { validateBody } from '@/middleware/validate';
import { createProductSchema } from '@/schemas/product.schema';
import { ProductEntity } from '@/database/entities/product.entity';

function toDto(product: ProductEntity) {
  return {
    id: product.id,
    tenant_id: product.tenantId,
    sku: product.sku,
    name: product.name,
    price: product.price,
    stock: product.stock,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}

export function createProductsRouter(container: AppContainer): Router {
  const router = Router();
  const { productsService } = container;

  router.use(requireTenant);

  router.post(
    '/',
    validateBody(createProductSchema),
    asyncHandler(async (req, res) => {
      const product = await productsService.create(req.body);
      sendCreated(res, req, toDto(product));
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const products = await productsService.list();
      sendSuccess(res, req, products.map(toDto));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await productsService.findById(String(req.params.id));
      sendSuccess(res, req, toDto(product));
    }),
  );

  return router;
}
