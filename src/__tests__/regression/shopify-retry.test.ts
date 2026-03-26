import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isShopifyValidationError } from '@/lib/shopify-retry';
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

// Import route handlers after mocks
import { POST as retryPendingPOST } from '@/app/api/shopify/retry-pending/route';

// ============================================================
// Source file paths
// ============================================================

const collaborationRoutePath = path.resolve(
  __dirname,
  '../../app/api/collaborations/[id]/route.ts'
);
const createOrderRoutePath = path.resolve(
  __dirname,
  '../../app/api/shopify/create-order/route.ts'
);
const retryPendingRoutePath = path.resolve(
  __dirname,
  '../../app/api/shopify/retry-pending/route.ts'
);

// ============================================================
// Reset
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// 1. withRetry utility
// ============================================================

describe('withRetry utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt when no error', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const promise = withRetry(fn);
    const result = await promise;

    expect(result).toEqual({ success: true, result: 'ok', attempts: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error (fetch failed)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    // Advance past first delay (100ms)
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on ECONNRESET', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should retry on 503 Service Unavailable', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Shopify API error (503): Service Unavailable'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should retry on 429 rate limit', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should NOT retry on 422 validation error (Shopify rejects)', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new Error('Shopify API error (422): Unprocessable Entity'));

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 400 bad request', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new Error('Shopify API error (400): Bad Request'));

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxRetries limit', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 });
    // Advance past all delays: 100ms + 200ms
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff (1s, 2s, 4s)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('503'));
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;

    // Track the delays passed to setTimeout via fake timers
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = withRetry(fn, { maxRetries: 4, baseDelayMs: 1000, maxDelayMs: 10000 });

    // Advance through each retry
    await vi.advanceTimersByTimeAsync(1000);  // 1st retry delay: 1000 * 2^0 = 1000
    await vi.advanceTimersByTimeAsync(2000);  // 2nd retry delay: 1000 * 2^1 = 2000
    await vi.advanceTimersByTimeAsync(4000);  // 3rd retry delay: 1000 * 2^2 = 4000

    const result = await promise;

    // Collect setTimeout calls with numeric delays (skip 0-delay ones from Promise internals)
    const timeoutCalls = setTimeoutSpy.mock.calls
      .map(call => call[1])
      .filter((delay): delay is number => typeof delay === 'number' && delay >= 1000);

    expect(timeoutCalls).toEqual([1000, 2000, 4000]);
    expect(result.attempts).toBe(4);

    setTimeoutSpy.mockRestore();
  });

  it('should succeed on 2nd attempt after 1st fails', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue({ id: 123 });

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toEqual({ success: true, result: { id: 123 }, attempts: 2 });
  });

  it('should succeed on 3rd attempt after 2 failures', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue({ id: 456 });

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);  // 1st delay
    await vi.advanceTimersByTimeAsync(200);  // 2nd delay
    const result = await promise;

    expect(result).toEqual({ success: true, result: { id: 456 }, attempts: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should return attempts count', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const result = await withRetry(fn);

    expect(result.attempts).toBe(1);
  });

  it('should cap delay at maxDelayMs', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('503'));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = withRetry(fn, { maxRetries: 5, baseDelayMs: 5000, maxDelayMs: 10000 });

    // Advance through all retries
    await vi.advanceTimersByTimeAsync(5000);   // 5000 * 2^0 = 5000
    await vi.advanceTimersByTimeAsync(10000);  // 5000 * 2^1 = 10000 (at cap)
    await vi.advanceTimersByTimeAsync(10000);  // 5000 * 2^2 = 20000, capped to 10000
    await vi.advanceTimersByTimeAsync(10000);  // 5000 * 2^3 = 40000, capped to 10000

    const result = await promise;

    const timeoutCalls = setTimeoutSpy.mock.calls
      .map(call => call[1])
      .filter((delay): delay is number => typeof delay === 'number' && delay >= 5000);

    // All delays should be <= maxDelayMs
    for (const delay of timeoutCalls) {
      expect(delay).toBeLessThanOrEqual(10000);
    }

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(5);

    setTimeoutSpy.mockRestore();
  });
});

// ============================================================
// 2. isShopifyValidationError
// ============================================================

describe('isShopifyValidationError', () => {
  it('should identify 422 as validation error', () => {
    expect(isShopifyValidationError('Shopify API error (422): Unprocessable Entity')).toBe(true);
  });

  it('should identify 400 as validation error', () => {
    expect(isShopifyValidationError('Shopify API error (400): Bad Request')).toBe(true);
  });

  it('should identify "is invalid" as validation error', () => {
    expect(isShopifyValidationError('Field email is invalid')).toBe(true);
  });

  it('should NOT identify 503 as validation error', () => {
    expect(isShopifyValidationError('Shopify API error (503): Service Unavailable')).toBe(false);
  });

  it('should NOT identify "fetch failed" as validation error', () => {
    expect(isShopifyValidationError('fetch failed')).toBe(false);
  });
});

// ============================================================
// 3. Retry integration in collaboration route (source verification)
// ============================================================

describe('Retry integration in collaboration route (source verification)', () => {
  const collabSource = fs.readFileSync(collaborationRoutePath, 'utf-8');
  const createOrderSource = fs.readFileSync(createOrderRoutePath, 'utf-8');

  it('collaboration route should use withRetry for order creation', () => {
    expect(collabSource).toContain("import { withRetry } from");
    expect(collabSource).toContain('withRetry(() => createOrder(orderInput)');
  });

  it('create-order route should use withRetry for order creation', () => {
    expect(createOrderSource).toContain("import { withRetry } from");
    expect(createOrderSource).toContain('withRetry(() => createOrder(orderInput)');
  });

  it('should set shopifyOrderStatus to pending_retry on failure', () => {
    expect(collabSource).toContain("shopifyOrderStatus: 'pending_retry'");
    expect(createOrderSource).toContain("shopifyOrderStatus: 'pending_retry'");
  });

  it('should log retry attempts', () => {
    expect(collabSource).toMatch(/Order created after.*attempt/);
    expect(collabSource).toMatch(/Order creation failed after.*attempts.*Marked for retry/);
    expect(createOrderSource).toMatch(/Order created after.*attempt/);
    expect(createOrderSource).toMatch(/Order creation failed after.*attempts.*Marked for retry/);
  });
});

// ============================================================
// 4. Retry pending orders endpoint
// ============================================================

describe('Retry pending orders endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOrder.mockResolvedValue({
      id: 9876543210,
      name: '#MARS-1001',
      order_number: 1001,
      fulfillment_status: null,
    });
    prismaMock.collaboration.update.mockResolvedValue({ id: 'collab-1' });
    prismaMock.activityLog.create.mockResolvedValue({ id: 'log-1' });
  });

  function makeCollabForRetry(overrides: Record<string, any> = {}) {
    return {
      id: 'collab-retry-1',
      type: 'paid',
      shopifyOrderStatus: 'pending_retry',
      influencer: {
        name: 'Test Influencer',
        instagramHandle: 'testinf',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
        phone: '+919876543210',
      },
      products: [
        {
          quantity: 2,
          product: {
            id: 'prod-1',
            name: 'MARS Lipstick',
            shopifyVariantId: '12345',
          },
        },
      ],
      ...overrides,
    };
  }

  it('should find all pending_retry collaborations', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([]);

    const res = await retryPendingPOST();
    const body = await res.json();

    expect(prismaMock.collaboration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopifyOrderStatus: 'pending_retry' },
      })
    );
    expect(body.retried).toBe(0);
    expect(body.message).toBe('No pending orders');
  });

  it('should skip collaborations with no Shopify products', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([
      makeCollabForRetry({
        products: [
          {
            quantity: 1,
            product: { id: 'prod-no-variant', name: 'Seeded Product', shopifyVariantId: null },
          },
        ],
      }),
    ]);

    const res = await retryPendingPOST();
    const body = await res.json();

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(prismaMock.collaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { shopifyOrderStatus: 'retry_failed_no_products' },
      })
    );
    expect(body.failed).toBe(1);
    expect(body.succeeded).toBe(0);
  });

  it('should create order with correct tags format', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([makeCollabForRetry()]);

    await retryPendingPOST();

    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const orderInput = mockCreateOrder.mock.calls[0][0];
    expect(orderInput.tags).toContain('influencer');
    expect(orderInput.tags).toContain('paid');
    expect(orderInput.tags).toContain('collab-');
    // No colons in tags
    const staticParts = orderInput.tags.replace(/\$\{[^}]+\}/g, '');
    expect(staticParts).not.toContain(':');
  });

  it('should update shopifyOrderId on success', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([makeCollabForRetry()]);

    const res = await retryPendingPOST();
    const body = await res.json();

    expect(prismaMock.collaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'collab-retry-1' },
        data: expect.objectContaining({
          shopifyOrderId: '9876543210',
          shopifyOrderStatus: 'unfulfilled',
        }),
      })
    );
    expect(body.succeeded).toBe(1);
  });

  it('should log to activityLog on repeated failure', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([makeCollabForRetry()]);
    mockCreateOrder.mockRejectedValue(new Error('503 Service Unavailable'));

    const res = await retryPendingPOST();
    const body = await res.json();

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'collaboration',
          entityId: 'collab-retry-1',
          action: 'shopify_retry_failed',
        }),
      })
    );
    expect(body.failed).toBe(1);
    expect(body.succeeded).toBe(0);
  });

  it('should return count of succeeded and failed', async () => {
    const collab1 = makeCollabForRetry({ id: 'collab-1' });
    const collab2 = makeCollabForRetry({ id: 'collab-2' });
    const collab3 = makeCollabForRetry({
      id: 'collab-3',
      products: [{ quantity: 1, product: { id: 'p', name: 'P', shopifyVariantId: null } }],
    });

    prismaMock.collaboration.findMany.mockResolvedValue([collab1, collab2, collab3]);

    // First call (collab-1) succeeds; all subsequent calls (collab-2 retries) fail with 503
    // collab-3 has no products so createOrder is never called for it
    mockCreateOrder
      .mockResolvedValueOnce({ id: 111, name: '#111', order_number: 111, fulfillment_status: null })
      .mockRejectedValue(new Error('503 Service Unavailable'));

    const res = await retryPendingPOST();
    const body = await res.json();

    expect(body.retried).toBe(3);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(2); // one 503 failure + one no-products
  });
});
