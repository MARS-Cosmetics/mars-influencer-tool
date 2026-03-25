import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../mocks/prisma';

// ============================================================
// Mock setup
// ============================================================

vi.mock('@/lib/shopify', () => ({
  USE_MOCK: true,
  fetchAllProducts: vi.fn().mockResolvedValue([]),
  fetchInventoryLevels: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    }),
  },
}));

import { POST as syncProductsPOST } from '@/app/api/shopify/sync-products/route';
import { POST as syncInventoryPOST } from '@/app/api/shopify/sync-inventory/route';
import { GET as syncStatusGET } from '@/app/api/shopify/sync-status/route';

// ============================================================
// Reset mocks
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.syncLog.create.mockResolvedValue({ id: 'log-1' });
  prismaMock.syncLog.update.mockResolvedValue({});
  prismaMock.syncLog.findFirst.mockResolvedValue(null);
  prismaMock.syncLog.findMany.mockResolvedValue([]);

  prismaMock.brand.findFirst.mockResolvedValue({ id: 'b-1', name: 'MARS' });

  (prismaMock.product as any).findFirst = vi.fn().mockResolvedValue(null);
  prismaMock.product.create.mockResolvedValue({ id: 'p-1' });
  prismaMock.product.findMany.mockResolvedValue([]);
  (prismaMock.product as any).count = vi.fn().mockResolvedValue(0);

  (prismaMock.collaboration as any).count = vi.fn().mockResolvedValue(0);
});

// ============================================================
// Content-Type
// ============================================================

describe('All sync API endpoints return application/json', () => {
  it('sync-products POST returns application/json', async () => {
    const res = await syncProductsPOST();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('sync-inventory POST returns application/json', async () => {
    const res = await syncInventoryPOST();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('sync-status GET returns application/json', async () => {
    const res = await syncStatusGET();
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});

// ============================================================
// Success responses
// ============================================================

describe('Success responses have success: true', () => {
  it('sync-products returns success: true', async () => {
    const res = await syncProductsPOST();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('sync-inventory returns success: true', async () => {
    const res = await syncInventoryPOST();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// Error responses
// ============================================================

describe('Error responses have success: false and error field', () => {
  it('sync-products error response has success: false and error', async () => {
    const { fetchAllProducts } = await import('@/lib/shopify');
    (fetchAllProducts as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Test failure')
    );

    const res = await syncProductsPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('sync-inventory error response has success: false and error', async () => {
    prismaMock.product.findMany.mockRejectedValueOnce(new Error('DB error'));

    const res = await syncInventoryPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
});

// ============================================================
// sync-status GET response shape
// ============================================================

describe('sync-status GET response shape', () => {
  it('should return connected boolean field', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('connected');
    expect(typeof body.connected).toBe('boolean');
  });

  it('should return latestSyncs object', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('latestSyncs');
    expect(typeof body.latestSyncs).toBe('object');
    expect(body.latestSyncs).not.toBeNull();
  });

  it('should include sync types in latestSyncs', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    // Should have entries for products, inventory, tracking
    expect(body.latestSyncs).toHaveProperty('products');
    expect(body.latestSyncs).toHaveProperty('inventory');
    expect(body.latestSyncs).toHaveProperty('tracking');
  });

  it('should return shopifyConnected field (alias for connected)', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('shopifyConnected');
    expect(typeof body.shopifyConnected).toBe('boolean');
  });

  it('should return usingMockData field (alias for mockMode)', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('usingMockData');
    expect(typeof body.usingMockData).toBe('boolean');
  });

  it('should return totalProductsSynced count', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('totalProductsSynced');
    expect(typeof body.totalProductsSynced).toBe('number');
  });

  it('should return totalOrdersTracked count', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('totalOrdersTracked');
    expect(typeof body.totalOrdersTracked).toBe('number');
  });

  it('should return products object with lastSynced and count (UI format)', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('products');
    expect(body.products).toHaveProperty('lastSynced');
    expect(body.products).toHaveProperty('count');
  });

  it('should return history array', async () => {
    const res = await syncStatusGET();
    const body = await res.json();

    expect(body).toHaveProperty('history');
    expect(Array.isArray(body.history)).toBe(true);
  });
});
