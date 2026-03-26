import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../mocks/prisma';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// Mock setup
// ============================================================

const mockCreateOrder = vi.fn();

vi.mock('@/lib/shopify', () => ({
  USE_MOCK: false,
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));

vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => {
        return {
          status: init?.status ?? 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => body,
        };
      },
    },
  };
});

// Import after mocks are registered
import { POST } from '@/app/api/shopify/create-order/route';

// ============================================================
// Helpers
// ============================================================

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Request;
}

function makeCollaboration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'collab-uuid-123',
    status: 'confirmed',
    type: 'paid',
    shopifyOrderId: null,
    influencer: {
      id: 'inf-1',
      name: 'Test Influencer',
      instagramHandle: 'testinfluencer',
      youtubeHandle: null,
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      phone: '+919876543210',
    },
    products: [
      {
        quantity: 1,
        product: {
          id: 'prod-1',
          name: 'Test Lipstick',
          shopifyVariantId: '12345',
          shopifyProductId: '67890',
        },
      },
    ],
    ...overrides,
  };
}

function makeShopifyOrderResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 9876543210,
    name: '#MARS-1001',
    order_number: 1001,
    fulfillment_status: null,
    tags: 'influencer, paid, collab-collab-uuid-123',
    created_at: '2026-03-26T10:00:00Z',
    ...overrides,
  };
}

// ============================================================
// Source file paths for source-code verification tests
// ============================================================

const createOrderRoutePath = path.resolve(
  __dirname,
  '../../app/api/shopify/create-order/route.ts'
);
const collaborationRoutePath = path.resolve(
  __dirname,
  '../../app/api/collaborations/[id]/route.ts'
);

// ============================================================
// Reset mocks before each test
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateOrder.mockResolvedValue(makeShopifyOrderResponse());
  prismaMock.collaboration.findUnique.mockResolvedValue(makeCollaboration());
  prismaMock.collaboration.update.mockResolvedValue({ id: 'collab-uuid-123' });
});

// ============================================================
// 1. TAG FORMAT VALIDATION (regression - Shopify 422 error)
// ============================================================

describe('Shopify Order Tags (regression)', () => {
  const createOrderSource = fs.readFileSync(createOrderRoutePath, 'utf-8');
  const collaborationRouteSource = fs.readFileSync(collaborationRoutePath, 'utf-8');

  it('tags should NOT contain colons', () => {
    // Extract tag template strings from both files
    const tagPatterns = [
      ...createOrderSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
      ...collaborationRouteSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
    ];

    expect(tagPatterns.length).toBeGreaterThan(0);

    for (const match of tagPatterns) {
      // The template literal may contain ${...} interpolations, but the static
      // parts (separators, prefixes) must not include colons
      const staticParts = match[1].replace(/\$\{[^}]+\}/g, '');
      expect(staticParts).not.toContain(':');
    }
  });

  it('tags should be comma-separated', () => {
    const tagPatterns = [
      ...createOrderSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
      ...collaborationRouteSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
    ];

    expect(tagPatterns.length).toBeGreaterThan(0);

    for (const match of tagPatterns) {
      // Tags use commas to separate values
      expect(match[1]).toContain(',');
    }
  });

  it('tags should include collaboration type (paid, barter, pr_gifting)', () => {
    const tagPatterns = [
      ...createOrderSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
      ...collaborationRouteSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
    ];

    expect(tagPatterns.length).toBeGreaterThan(0);

    for (const match of tagPatterns) {
      // Should reference collaboration.type or fullCollab.type via interpolation
      expect(match[1]).toMatch(/\$\{.*\.type\}/);
    }
  });

  it('tags should include "influencer" keyword', () => {
    const tagPatterns = [
      ...createOrderSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
      ...collaborationRouteSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
    ];

    expect(tagPatterns.length).toBeGreaterThan(0);

    for (const match of tagPatterns) {
      expect(match[1]).toContain('influencer');
    }
  });

  it('tags should include collaboration ID with dash separator (collab-uuid)', () => {
    const tagPatterns = [
      ...createOrderSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
      ...collaborationRouteSource.matchAll(/tags\s*[:=]\s*[`"']([^`"']*)[`"']/g),
    ];

    expect(tagPatterns.length).toBeGreaterThan(0);

    for (const match of tagPatterns) {
      // Should use collab-${id} pattern (dash, not colon)
      expect(match[1]).toMatch(/collab-\$\{/);
    }
  });
});

// ============================================================
// 2. PRODUCT VALIDATION
// ============================================================

describe('Shopify Order Product Validation (regression)', () => {
  it('should reject order when no products are linked to collaboration', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({ products: [] })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no products/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('should reject products without shopifyVariantId', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({
        products: [
          {
            quantity: 1,
            product: {
              id: 'prod-no-variant',
              name: 'Seeded Product',
              shopifyVariantId: null,
              shopifyProductId: null,
            },
          },
        ],
      })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/no Shopify variant ID/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('should warn when seeded products (no Shopify IDs) are used', () => {
    // Verify the source code checks for shopifyVariantId before creating line items
    const source = fs.readFileSync(createOrderRoutePath, 'utf-8');

    // The standalone route throws an error for missing variant ID
    expect(source).toMatch(/shopifyVariantId/);
    expect(source).toMatch(/no Shopify variant ID/i);

    // The collaboration route filters products without Shopify IDs and warns
    const collabSource = fs.readFileSync(collaborationRoutePath, 'utf-8');
    expect(collabSource).toMatch(/No products have Shopify IDs/i);
  });

  it('should set price to "1.00" for all line items (not actual product price)', async () => {
    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    await res.json();

    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const orderInput = mockCreateOrder.mock.calls[0][0];

    for (const item of orderInput.line_items) {
      expect(item.price).toBe('1.00');
    }
  });
});

// ============================================================
// 3. RACE CONDITION PREVENTION
// ============================================================

describe('Shopify Order Race Condition (regression)', () => {
  const collabRouteSource = fs.readFileSync(collaborationRoutePath, 'utf-8');

  it('should check shopifyOrderId is null before creating order', () => {
    // The inline order creation in the collaboration route checks
    // !previousCollab.shopifyOrderId before proceeding
    expect(collabRouteSource).toContain('!previousCollab.shopifyOrderId');
  });

  it('should use atomic lock pattern (set temporary placeholder)', () => {
    // The collaboration route uses updateMany with shopifyOrderId: null
    // as a WHERE condition to atomically claim the lock
    expect(collabRouteSource).toMatch(/updateMany/);
    expect(collabRouteSource).toMatch(/shopifyOrderId:\s*null/);
    expect(collabRouteSource).toMatch(/pending-\$\{Date\.now\(\)\}/);
  });

  it('should not create duplicate orders for same collaboration', () => {
    // After the atomic lock, if count === 0, another request already claimed it
    expect(collabRouteSource).toContain('lockResult.count === 0');
    expect(collabRouteSource).toMatch(/already being created/i);
  });
});

// ============================================================
// 4. ADDRESS VALIDATION
// ============================================================

describe('Shopify Order Address Validation (regression)', () => {
  it('should require addressLine1, city, state, pincode', async () => {
    // Test with missing addressLine1
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({
        influencer: {
          id: 'inf-1',
          name: 'Test Influencer',
          instagramHandle: 'test',
          youtubeHandle: null,
          addressLine1: null,
          addressLine2: null,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
          phone: '+919876543210',
        },
      })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/address/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('should default country to India when not specified', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({
        influencer: {
          id: 'inf-1',
          name: 'Test Influencer',
          instagramHandle: 'test',
          youtubeHandle: null,
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: null, // No country set
          phone: '+919876543210',
        },
      })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    await res.json();

    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const orderInput = mockCreateOrder.mock.calls[0][0];
    expect(orderInput.shipping_address.country).toBe('India');
  });

  it('should handle missing phone number gracefully', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({
        influencer: {
          id: 'inf-1',
          name: 'Test Influencer',
          instagramHandle: 'test',
          youtubeHandle: null,
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
          phone: null, // No phone
        },
      })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);

    const orderInput = mockCreateOrder.mock.calls[0][0];
    expect(orderInput.shipping_address.phone).toBeUndefined();
  });
});

// ============================================================
// 5. STATUS VALIDATION
// ============================================================

describe('Shopify Order Status Requirements (regression)', () => {
  it('should only create orders for "confirmed" status', async () => {
    // With confirmed status, order should be created
    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });

  it('should NOT create orders when status changes to "cancelled"', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({ status: 'cancelled' })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/confirmed/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('should NOT create orders for barter collaborations that are cancelled', async () => {
    prismaMock.collaboration.findUnique.mockResolvedValue(
      makeCollaboration({ status: 'cancelled', type: 'barter' })
    );

    const res = await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/confirmed/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });
});

// ============================================================
// 6. ORDER RESPONSE HANDLING
// ============================================================

describe('Shopify Order Response Handling (regression)', () => {
  it('should save shopifyOrderId to collaboration after creation', async () => {
    mockCreateOrder.mockResolvedValue(makeShopifyOrderResponse({ id: 1112223334 }));

    await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);

    expect(prismaMock.collaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'collab-uuid-123' },
        data: expect.objectContaining({
          shopifyOrderId: '1112223334',
        }),
      })
    );
  });

  it('should save shopifyOrderNumber to collaboration', async () => {
    mockCreateOrder.mockResolvedValue(makeShopifyOrderResponse({ name: '#MARS-2001' }));

    await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);

    expect(prismaMock.collaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopifyOrderNumber: '#MARS-2001',
        }),
      })
    );
  });

  it('should save shopifyOrderStatus as "unfulfilled" initially', async () => {
    // Shopify returns fulfillment_status: null for new orders
    mockCreateOrder.mockResolvedValue(makeShopifyOrderResponse({ fulfillment_status: null }));

    await POST(makeRequest({ collaborationId: 'collab-uuid-123' }) as any);

    expect(prismaMock.collaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopifyOrderStatus: 'unfulfilled',
        }),
      })
    );
  });
});
