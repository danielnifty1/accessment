import { Router } from 'express';
import { AppContainer } from '@/container';
import { asyncHandler } from '@/lib/async-handler';
import { requireTenant } from '@/middleware/tenant';
import { validateBody } from '@/middleware/validate';
import { createProductSchema } from '@/schemas/product.schema';
import { ProductEntity } from '@/database/entities/product.entity';

function toResponse(product: ProductEntity) {
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
  const { productsService, tenantContext } = container;

  router.use(requireTenant);

  router.post(
    '/',
    validateBody(createProductSchema),
    asyncHandler(async (req, res) => {
      const product = await productsService.create(req.body);
      res.status(201).json({
        ...toResponse(product),
        request_id: tenantContext.getRequestId(),
      });
    }),
  );

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const products = await productsService.list();
      res.json({
        data: products.map(toResponse),
        request_id: tenantContext.getRequestId(),
      });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await productsService.findById(String(req.params.id));
      res.json({
        ...toResponse(product),
        request_id: tenantContext.getRequestId(),
      });
    }),
  );

  return router;
}
