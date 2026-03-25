import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Shopify Pagination E2E Regression Tests
 *
 * These tests verify that fetchAllProducts correctly follows Shopify's
 * cursor-based pagination via the Link header. They use the REAL
 * fetchAllProducts function (no vi.mock on @/lib/shopify) with a
 * mocked global fetch to simulate Shopify API responses.
 *
 * This file is separate from shopify-sync.test.ts because that file
 * uses vi.mock('@/lib/shopify') which hoists and cannot be undone
 * within the same file.
 */

// Helper to build a minimal Shopify product fixture
function makeProduct(id: number) {
  return {
    id,
    title: `Product ${id}`,
    body_html: '<p>desc</p>',
    vendor: 'MARS Cosmetics',
    product_type: 'Lipstick',
    status: 'active',
    variants: [
      {
        id: id * 100,
        product_id: id,
        title: 'Default',
        price: '199.00',
        sku: `SKU-${id}`,
        inventory_item_id: id * 200,
        inventory_quantity: 50,
      },
    ],
    images: [{ id: id * 300, src: 'https://example.com/img.png' }],
    image: { id: id * 300, src: 'https://example.com/img.png' },
  };
}

describe('Shopify Pagination E2E (regression)', () => {
  let shopifyModule: typeof import('@/lib/shopify');
  let origStore: string | undefined;
  let origToken: string | undefined;
  let origVersion: string | undefined;

  beforeAll(async () => {
    // Save original env
    origStore = process.env.SHOPIFY_STORE_URL;
    origToken = process.env.SHOPIFY_ACCESS_TOKEN;
    origVersion = process.env.SHOPIFY_API_VERSION;

    // Set env vars so USE_MOCK = false
    process.env.SHOPIFY_STORE_URL = 'test-store.myshopify.com';
    process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_test_token';
    process.env.SHOPIFY_API_VERSION = '2024-10';

    shopifyModule = await import('@/lib/shopify');
  });

  afterAll(() => {
    // Restore env
    if (origStore) process.env.SHOPIFY_STORE_URL = origStore; else delete process.env.SHOPIFY_STORE_URL;
    if (origToken) process.env.SHOPIFY_ACCESS_TOKEN = origToken; else delete process.env.SHOPIFY_ACCESS_TOKEN;
    if (origVersion) process.env.SHOPIFY_API_VERSION = origVersion; else delete process.env.SHOPIFY_API_VERSION;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should follow full Link header URLs across pages', async () => {
    const page2Url =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=abc123&limit=250';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Page 1: has Link with next
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(1)] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Link: `<${page2Url}>; rel="next"`,
        },
      })
    );

    // Page 2: no Link header (last page)
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(2)] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const allProducts = await shopifyModule.fetchAllProducts();

    expect(allProducts).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // The second call must use the FULL URL from the Link header
    const secondCallUrl = fetchSpy.mock.calls[1][0];
    expect(secondCallUrl).toBe(page2Url);

    // Must NOT have appended page_info as a query param to the base URL
    expect(secondCallUrl).not.toMatch(/products\.json\?limit=250&page_info=/);
  });

  it('should handle Link header with both "next" and "previous" rels', async () => {
    const nextUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=next123&limit=250';
    const prevUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=prev123&limit=250';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(1)] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Link: `<${prevUrl}>; rel="previous", <${nextUrl}>; rel="next"`,
        },
      })
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(2)] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const allProducts = await shopifyModule.fetchAllProducts();

    expect(allProducts).toHaveLength(2);
    const secondCallUrl = fetchSpy.mock.calls[1][0];
    expect(secondCallUrl).toBe(nextUrl);
    expect(secondCallUrl).not.toBe(prevUrl);
  });

  it('should stop when no Link header is present', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(1)] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const allProducts = await shopifyModule.fetchAllProducts();

    expect(allProducts).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should stop when Link header has no "next" rel', async () => {
    const prevUrl =
      'https://test-store.myshopify.com/admin/api/2024-10/products.json?page_info=prev123&limit=250';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [makeProduct(1)] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Link: `<${prevUrl}>; rel="previous"`,
        },
      })
    );

    const allProducts = await shopifyModule.fetchAllProducts();

    expect(allProducts).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle empty product pages gracefully', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const allProducts = await shopifyModule.fetchAllProducts();

    expect(allProducts).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
