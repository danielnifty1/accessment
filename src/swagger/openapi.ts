export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Flash Sale Inventory & Orders API',
    version: '1.0.0',
    description:
      'Multi-tenant flash sale API. Orders are processed asynchronously via BullMQ. ' +
      'Stock is deducted in the worker, not on POST /orders.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local / Docker host' }],
  tags: [
    { name: 'Health', description: 'Liveness and metrics' },
    { name: 'Products', description: 'Tenant-scoped product catalog' },
    { name: 'Campaigns', description: 'Flash sale campaigns' },
    { name: 'Orders', description: 'Async order placement and queries' },
  ],
  components: {
    securitySchemes: {
      TenantHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Tenant-Id',
        description: 'Tenant identifier (required on tenant-scoped routes)',
      },
      IdempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'Unique key per logical order request (POST /orders only)',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        required: ['success', 'request_id', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          request_id: { type: 'string' },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
            },
          },
        },
      },
      ApiSuccessEnvelope: {
        type: 'object',
        required: ['success', 'request_id', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          request_id: { type: 'string' },
          data: {},
          meta: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional metadata (e.g. next_cursor for lists)',
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          checks: {
            type: 'object',
            properties: {
              database: { type: 'boolean' },
              redis: { type: 'boolean' },
            },
          },
        },
      },
      CreateProduct: {
        type: 'object',
        required: ['sku', 'name', 'price', 'stock'],
        properties: {
          sku: { type: 'string', example: 'FLASH-001' },
          name: { type: 'string', example: 'Limited Sneakers' },
          price: { type: 'string', example: '99.99', description: 'DECIMAL string' },
          stock: { type: 'integer', minimum: 0, example: 50 },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenant_id: { type: 'string' },
          sku: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'string' },
          stock: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateCampaign: {
        type: 'object',
        required: ['product_id', 'start_time', 'end_time'],
        properties: {
          product_id: { type: 'string', format: 'uuid' },
          start_time: { type: 'string', format: 'date-time', description: 'UTC, inclusive' },
          end_time: { type: 'string', format: 'date-time', description: 'UTC, exclusive' },
          max_per_user: { type: 'integer', minimum: 1, nullable: true },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenant_id: { type: 'string' },
          product_id: { type: 'string', format: 'uuid' },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
          max_per_user: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateOrder: {
        type: 'object',
        required: ['campaign_id', 'product_id', 'user_id', 'quantity'],
        properties: {
          campaign_id: { type: 'string', format: 'uuid' },
          product_id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', example: 'user-42' },
          quantity: { type: 'integer', minimum: 1, maximum: 100, example: 1 },
        },
      },
      PlaceOrderResponse: {
        type: 'object',
        properties: {
          request_id: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'] },
          order_id: { type: 'string', format: 'uuid' },
          rejection_reason_code: {
            type: 'string',
            enum: [
              'OUT_OF_STOCK',
              'CAMPAIGN_INACTIVE',
              'LIMIT_EXCEEDED',
              'DUPLICATE_ORDER',
            ],
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenant_id: { type: 'string' },
          campaign_id: { type: 'string', format: 'uuid' },
          product_id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string' },
          quantity: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'] },
          idempotency_key: { type: 'string' },
          rejection_reason_code: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          request_id: { type: 'string' },
        },
      },
    },
    parameters: {
      TenantId: {
        name: 'X-Tenant-Id',
        in: 'header',
        required: true,
        schema: { type: 'string', example: 'demo-tenant' },
      },
      IdempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: { type: 'string', example: 'order-attempt-001' },
      },
    },
    responses: {
      ApiError: {
        description: 'Standard error envelope',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service health',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Request and rejection metrics',
        responses: {
          '200': { description: 'Metrics snapshot' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        security: [{ TenantHeader: [] }],
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        responses: {
          '200': {
            description: 'Product list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                    request_id: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ApiError' },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        security: [{ TenantHeader: [] }],
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProduct' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ApiError' },
          '409': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        security: [{ TenantHeader: [] }],
        parameters: [
          { $ref: '#/components/parameters/TenantId' },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          '404': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'List campaigns',
        security: [{ TenantHeader: [] }],
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Campaign' },
                    },
                    request_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Create campaign',
        security: [{ TenantHeader: [] }],
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCampaign' },
            },
          },
        },
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Campaign' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ApiError' },
          '404': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/campaigns/{id}': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get campaign by ID',
        security: [{ TenantHeader: [] }],
        parameters: [
          { $ref: '#/components/parameters/TenantId' },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Campaign' },
              },
            },
          },
          '404': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders (cursor pagination)',
        security: [{ TenantHeader: [] }],
        parameters: [
          { $ref: '#/components/parameters/TenantId' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'] },
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderList' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Place order (async)',
        description:
          'Returns PENDING immediately. Worker confirms or rejects. Does not deduct stock in this request.',
        security: [{ TenantHeader: [] }, { IdempotencyKey: [] }],
        parameters: [
          { $ref: '#/components/parameters/TenantId' },
          { $ref: '#/components/parameters/IdempotencyKey' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrder' },
            },
          },
        },
        responses: {
          '202': {
            description: 'Accepted — processing in background',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PlaceOrderResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ApiError' },
          '409': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        security: [{ TenantHeader: [] }],
        parameters: [
          { $ref: '#/components/parameters/TenantId' },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
              },
            },
          },
          '404': { $ref: '#/components/responses/ApiError' },
        },
      },
    },
  },
} as const;
