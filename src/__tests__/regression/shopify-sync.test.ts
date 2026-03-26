import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { prismaMock } from '../mocks/prisma';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// Mock setup
// ============================================================

// Mock @/lib/shopify so we can control fetchAllProducts / fetchInventoryLevels
vi.mock('@/lib/shopify', () => ({
  USE_MOCK: false,
  fetchAllProducts: vi.fn(),
  fetchInventoryLevels: vi.fn(),
}));

// Mock next/server so NextResponse.json works outside Next.js runtime
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
import { fetchAllProducts, fetchInventoryLevels } from '@/lib/shopify';
import { POST as syncProductsPOST } from '@/app/api/shopify/sync-products/route';
import { POST as syncInventoryPOST } from '@/app/api/shopify/sync-inventory/route';

const mockFetchAllProducts = fetchAllProducts as ReturnType<typeof vi.fn>;
const mockFetchInventoryLevels = fetchInventoryLevels as ReturnType<typeof vi.fn>;

// ============================================================
// Helper: build a Shopify product fixture
// ============================================================

function makeShopifyProduct(overrides: {
  id?: number;
  title?: string;
  sku?: string | null;
  variantId?: number;
  inventoryItemId?: number;
  status?: string;
  variants?: Array<{
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string | null;
    inventory_item_id: number;
    inventory_quantity: number;
  }>;
} = {}) {
  const pid = overrides.id ?? 1;
  const vid = overrides.variantId ?? 100;
  const iid = overrides.inventoryItemId ?? 200;

  return {
    id: pid,
    title: overrides.title ?? 'Test Product',
    body_html: '<p>desc</p>',
    vendor: 'MARS Cosmetics',
    product_type: 'Lipstick',
    status: overrides.status ?? 'active',
    variants: overrides.variants ?? [
      {
        id: vid,
        product_id: pid,
        title: 'Default',
        price: '199.00',
        sku: overrides.sku === undefined ? 'TEST-SKU-001' : overrides.sku,
        inventory_item_id: iid,
        inventory_quantity: 50,
      },
    ],
    images: [{ id: 300, src: 'https://example.com/img.png' }],
    image: { id: 300, src: 'https://example.com/img.png' },
  };
}

// ============================================================
// Reset mocks before each test
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default: syncLog.create returns an object with an id
  prismaMock.syncLog.create.mockResolvedValue({ id: 'sync-log-1' });
  prismaMock.syncLog.update.mockResolvedValue({});

  // Default: brand exists
  prismaMock.brand.findFirst.mockResolvedValue({ id: 'brand-1', name: 'MARS Cosmetics' });

  // Default: upsert returns a new product (createdAt === updatedAt means new)
  const now = new Date();
  (prismaMock.product as any).upsert = vi.fn().mockResolvedValue({
    id: 'prod-1',
    createdAt: now,
    updatedAt: now,
  });
  prismaMock.product.create.mockResolvedValue({ id: 'prod-1' });
  prismaMock.product.update.mockResolvedValue({ id: 'prod-1' });
  (prismaMock.product as any).updateMany = vi.fn().mockResolvedValue({ count: 1 });

  // Default inventory mocks
  mockFetchInventoryLevels.mockResolvedValue([]);
});

// ============================================================
// 1. SKU DUPLICATE HANDLING
// ============================================================

describe('SKU Duplicate Handling (regression)', () => {
  it('should NOT throw unique constraint errors when syncing products with duplicate SKUs', async () => {
    // Two different products sharing the same SKU — upsert by shopifyVariantId handles this
    const products = [
      makeShopifyProduct({ id: 1, variantId: 101, sku: 'DUPE-SKU' }),
      makeShopifyProduct({ id: 2, variantId: 102, sku: 'DUPE-SKU' }),
    ];

    mockFetchAllProducts.mockResolvedValue(products);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    // Both products should be upserted (2 calls to upsert)
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(2);
  });

  it('should handle null SKUs without errors', async () => {
    const products = [
      makeShopifyProduct({ id: 1, variantId: 101, sku: null }),
      makeShopifyProduct({ id: 2, variantId: 102, sku: null }),
    ];

    mockFetchAllProducts.mockResolvedValue(products);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(2);

    // Verify the data passed has sku as null
    for (const call of (prismaMock.product as any).upsert.mock.calls) {
      expect(call[0].create.sku).toBeNull();
    }
  });

  it('should handle empty string SKUs without errors', async () => {
    const products = [
      makeShopifyProduct({ id: 1, variantId: 101, sku: '' }),
      makeShopifyProduct({ id: 2, variantId: 102, sku: '' }),
    ];

    mockFetchAllProducts.mockResolvedValue(products);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(2);
  });

  it('should create separate Product rows for each variant of the same product', async () => {
    const multiVariantProduct = makeShopifyProduct({
      id: 1,
      variants: [
        { id: 101, product_id: 1, title: 'Small', price: '199.00', sku: 'MARS-LIP-S', inventory_item_id: 201, inventory_quantity: 50 },
        { id: 102, product_id: 1, title: 'Medium', price: '249.00', sku: 'MARS-LIP-M', inventory_item_id: 202, inventory_quantity: 30 },
        { id: 103, product_id: 1, title: 'Large', price: '299.00', sku: 'MARS-LIP-L', inventory_item_id: 203, inventory_quantity: 20 },
      ],
    });

    mockFetchAllProducts.mockResolvedValue([multiVariantProduct]);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    // 3 variants = 3 upsert calls (one per variant)
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(3);
  });
});

// ============================================================
// 2. VARIANT-BASED UPSERT
// ============================================================

describe('Variant-based Upsert (regression)', () => {
  it('should upsert by shopifyVariantId (the unique Shopify identifier)', async () => {
    const products = [makeShopifyProduct({ id: 1, variantId: 101 })];
    mockFetchAllProducts.mockResolvedValue(products);

    await syncProductsPOST();

    // upsert must be called with shopifyVariantId as the where clause
    expect((prismaMock.product as any).upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopifyVariantId: '101' },
      })
    );
  });

  it('should update existing product when variant already exists', async () => {
    // Simulate an existing product by making upsert return different timestamps
    const created = new Date('2026-01-01');
    const updated = new Date('2026-03-26');
    (prismaMock.product as any).upsert.mockResolvedValue({
      id: 'existing-prod-uuid',
      createdAt: created,
      updatedAt: updated,
    });

    const products = [makeShopifyProduct({ id: 1, variantId: 101 })];
    mockFetchAllProducts.mockResolvedValue(products);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(1);
  });

  it('should upsert 3 product rows for a product with 3 variants', async () => {
    const product = makeShopifyProduct({
      id: 5,
      variants: [
        { id: 501, product_id: 5, title: 'V1', price: '100.00', sku: 'S1', inventory_item_id: 601, inventory_quantity: 10 },
        { id: 502, product_id: 5, title: 'V2', price: '200.00', sku: 'S2', inventory_item_id: 602, inventory_quantity: 20 },
        { id: 503, product_id: 5, title: 'V3', price: '300.00', sku: 'S3', inventory_item_id: 603, inventory_quantity: 30 },
      ],
    });

    mockFetchAllProducts.mockResolvedValue([product]);

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect((prismaMock.product as any).upsert).toHaveBeenCalledTimes(3);

    // Verify each upsert uses the correct shopifyVariantId
    const variantIds = (prismaMock.product as any).upsert.mock.calls.map(
      (call: any) => call[0].where.shopifyVariantId
    );
    expect(variantIds).toEqual(expect.arrayContaining(['501', '502', '503']));
  });
});

// ============================================================
// 3. PAGINATION (fetchAllProducts with Link header)
//
// We test pagination logic by directly testing the regex parsing
// and URL-following behavior that fetchAllProducts implements.
// Since the top-level vi.mock intercepts @/lib/shopify, we test
// pagination by verifying the implementation pattern: the code
// uses `linkHeader.match(/<([^>]+)>;\s*rel="next"/)` and follows
// the FULL URL from the match result rather than appending page_info.
// ============================================================

describe('Shopify Pagination Logic (regression)', () => {
  // The regex used inside fetchAllProducts for cursor pagination
  const linkRegex = /<([^>]+)>;\s*rel="next"/;

  it('should extract the full URL from a Link header with rel="next"', () => {
    const fullUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=abc123&limit=250';
    const linkHeader = `<${fullUrl}>; rel="next"`;

    const match = linkHeader.match(linkRegex);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(fullUrl);

    // The extracted URL is a complete URL, not just a page_info param
    expect(match![1]).toContain('https://');
    expect(match![1]).toContain('page_info=abc123');
  });

  it('should extract "next" URL when both "next" and "previous" rels are present', () => {
    const nextUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=next123&limit=250';
    const prevUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=prev123&limit=250';

    const linkHeader = `<${prevUrl}>; rel="previous", <${nextUrl}>; rel="next"`;

    const match = linkHeader.match(linkRegex);
    expect(match).not.toBeNull();
    // Should match the "next" URL, not "previous"
    expect(match![1]).toBe(nextUrl);
    expect(match![1]).not.toBe(prevUrl);
  });

  it('should return null match when no "next" rel is present', () => {
    const prevUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=prev123&limit=250';

    const linkHeader = `<${prevUrl}>; rel="previous"`;

    const match = linkHeader.match(linkRegex);
    expect(match).toBeNull();
  });

  it('should return null match for empty Link header', () => {
    const match = ''.match(linkRegex);
    expect(match).toBeNull();
  });

  it('fetchAllProducts code should use full URL from Link header (source verification)', () => {
    // Read the source to confirm the implementation pattern is correct
    const shopifySource = fs.readFileSync(
      path.resolve(__dirname, '../../lib/shopify.ts'),
      'utf-8'
    );

    // Verify it uses the Link header regex to extract the full URL
    expect(shopifySource).toContain('rel="next"');
    // The regex in source looks like: /<([^>]+)>/
    expect(shopifySource).toContain('<([^>]+)>');

    // Verify it assigns the full URL back to nextUrl (not just page_info)
    // The code should have: nextUrl = nextMatch ? nextMatch[1] : null
    expect(shopifySource).toContain('nextMatch[1]');

    // Verify it does NOT construct URLs by appending page_info as a param
    // (this was the old buggy pattern)
    expect(shopifySource).not.toMatch(/page_info=\$\{/);
    expect(shopifySource).not.toContain('&page_info=');
  });
});

// Pagination E2E tests are in a separate file (shopify-pagination.test.ts)
// to avoid conflicts with the hoisted vi.mock('@/lib/shopify') in this file.

// ============================================================
// 4. API RESPONSE FORMAT
// ============================================================

describe('API Response Format (regression)', () => {
  // sync-status tests are covered in api-response-format.test.ts
  // to avoid redundant nested vi.mock() warnings in this file.

  describe('sync-products POST', () => {
    it('should return JSON with success field on success', async () => {
      mockFetchAllProducts.mockResolvedValue([]);
      mockFetchInventoryLevels.mockResolvedValue([]);

      const res = await syncProductsPOST();
      const body = await res.json();

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
    });
  });

  describe('sync-inventory POST', () => {
    it('should return JSON with success field on success', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const res = await syncInventoryPOST();
      const body = await res.json();

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
    });
  });
});

// ============================================================
// 5. ERROR HANDLING
// ============================================================

describe('Error Handling (regression)', () => {
  it('should handle non-JSON responses gracefully (e.g. auth redirects)', async () => {
    // Simulate fetchAllProducts throwing because of a non-JSON response
    mockFetchAllProducts.mockRejectedValue(
      new Error('Shopify API error (302): <html>Redirect</html>')
    );

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toContain('302');
  });

  it('should create a SyncLog entry even if sync fails', async () => {
    mockFetchAllProducts.mockRejectedValue(new Error('Network failure'));

    await syncProductsPOST();

    // syncLog.create must have been called before the error
    expect(prismaMock.syncLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.syncLog.create).toHaveBeenCalledWith({
      data: { syncType: 'products', status: 'running' },
    });
  });

  it('should update SyncLog with error message on failure', async () => {
    mockFetchAllProducts.mockRejectedValue(new Error('API rate limited'));

    await syncProductsPOST();

    // syncLog.update should be called with status: "failed" and errorMessage
    expect(prismaMock.syncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sync-log-1' },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'API rate limited',
        }),
      })
    );
  });

  it('should handle Shopify API errors (4xx) gracefully', async () => {
    mockFetchAllProducts.mockRejectedValue(
      new Error('Shopify API error (401): Unauthorized')
    );

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('syncLogId');
  });

  it('should handle Shopify API errors (5xx) gracefully', async () => {
    mockFetchAllProducts.mockRejectedValue(
      new Error('Shopify API error (503): Service Unavailable')
    );

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toContain('503');
  });
});

// ============================================================
// 6. UI SECURITY
// ============================================================

describe('UI Security - Shopify Settings Page (regression)', () => {
  const settingsPagePath = path.resolve(
    __dirname,
    '../../app/(dashboard)/settings/shopify/page.tsx'
  );
  let pageSource: string;

  beforeAll(() => {
    pageSource = fs.readFileSync(settingsPagePath, 'utf-8');
  });

  it('should NOT contain env var name SHOPIFY_STORE_URL', () => {
    expect(pageSource).not.toContain('SHOPIFY_STORE_URL');
  });

  it('should NOT contain env var name SHOPIFY_ACCESS_TOKEN', () => {
    expect(pageSource).not.toContain('SHOPIFY_ACCESS_TOKEN');
  });

  it('should NOT contain env var name SHOPIFY_API_VERSION', () => {
    expect(pageSource).not.toContain('SHOPIFY_API_VERSION');
  });

  it('should NOT contain "Configuration" as a card title', () => {
    // Check for CardTitle with "Configuration" text
    // The pattern <CardTitle>Configuration</CardTitle> or similar
    expect(pageSource).not.toMatch(/<CardTitle>\s*Configuration\s*<\/CardTitle>/);
  });
});
