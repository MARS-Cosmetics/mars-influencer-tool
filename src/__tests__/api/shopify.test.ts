import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * Unit tests for Shopify client MOCK functions.
 * Forces mock mode by clearing env vars before importing the module.
 */

describe('Shopify Client (Mock Mode)', () => {
  let shopify: typeof import('@/lib/shopify');

  beforeAll(async () => {
    // Clear env vars so USE_MOCK = true, then dynamically import
    const origStore = process.env.SHOPIFY_STORE_URL;
    const origToken = process.env.SHOPIFY_ACCESS_TOKEN;
    delete process.env.SHOPIFY_STORE_URL;
    delete process.env.SHOPIFY_ACCESS_TOKEN;

    // Reset module cache to get fresh import with no env vars
    vi.resetModules();
    shopify = await import('@/lib/shopify');

    // Restore env vars for other test files
    if (origStore) process.env.SHOPIFY_STORE_URL = origStore;
    if (origToken) process.env.SHOPIFY_ACCESS_TOKEN = origToken;
  });

  describe('USE_MOCK flag', () => {
    it('should be true when module loaded without env vars', () => {
      expect(shopify.USE_MOCK).toBe(true);
    });
  });

  describe('fetchAllProducts (mock)', () => {
    it('should return an array of products with correct shape', async () => {
      const products = await shopify.fetchAllProducts();

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);

      const product = products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('body_html');
      expect(product).toHaveProperty('vendor');
      expect(product).toHaveProperty('product_type');
      expect(product).toHaveProperty('status');
      expect(product).toHaveProperty('variants');
      expect(product).toHaveProperty('images');
      expect(product).toHaveProperty('image');
    });

    it('should return products with valid variants', async () => {
      const products = await shopify.fetchAllProducts();
      const variant = products[0].variants[0];

      expect(variant).toHaveProperty('id');
      expect(variant).toHaveProperty('product_id');
      expect(variant).toHaveProperty('title');
      expect(variant).toHaveProperty('price');
      expect(variant).toHaveProperty('sku');
      expect(variant).toHaveProperty('inventory_item_id');
      expect(variant).toHaveProperty('inventory_quantity');
      expect(typeof variant.price).toBe('string');
      expect(typeof variant.id).toBe('number');
    });

    it('should return products with images', async () => {
      const products = await shopify.fetchAllProducts();
      const product = products[0];

      expect(product.images.length).toBeGreaterThan(0);
      expect(product.images[0]).toHaveProperty('id');
      expect(product.images[0]).toHaveProperty('src');
      expect(product.image).not.toBeNull();
      expect(product.image!.src).toContain('http');
    });

    it('should return products with MARS vendor', async () => {
      const products = await shopify.fetchAllProducts();
      for (const product of products) {
        expect(product.vendor).toBe('MARS Cosmetics');
      }
    });

    it('should return products with active status', async () => {
      const products = await shopify.fetchAllProducts();
      for (const product of products) {
        expect(product.status).toBe('active');
      }
    });
  });

  describe('createOrder (mock)', () => {
    it('should return an order with id and order_number', async () => {
      const order = await shopify.createOrder({
        line_items: [{ variant_id: 1, quantity: 1, price: '199.00', title: 'Test' }],
        tags: 'influencer,test',
        note: 'Test order',
        shipping_address: {
          first_name: 'Test',
          last_name: 'User',
          address1: '123 Main St',
          city: 'Mumbai',
          province: 'Maharashtra',
          zip: '400001',
          country: 'India',
        },
        financial_status: 'paid',
        send_receipt: false,
        send_fulfillment_receipt: false,
      });

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('order_number');
      expect(order).toHaveProperty('name');
      expect(order).toHaveProperty('tags');
      expect(typeof order.id).toBe('number');
      expect(order.tags).toBe('influencer,test');
      expect(order.note).toBe('Test order');
    });

    it('should increment order numbers on successive calls', async () => {
      const input = {
        line_items: [{ variant_id: 1, quantity: 1, price: '100.00', title: 'Item' }],
        tags: 'test',
        note: '',
        shipping_address: {
          first_name: 'A', last_name: 'B', address1: '1 St',
          city: 'Delhi', province: 'Delhi', zip: '110001', country: 'India',
        },
        financial_status: 'paid',
        send_receipt: false,
        send_fulfillment_receipt: false,
      };

      const order1 = await shopify.createOrder(input);
      const order2 = await shopify.createOrder(input);
      expect(order2.order_number).toBeGreaterThan(order1.order_number);
    });
  });

  describe('fetchInventoryLevels (mock)', () => {
    it('should return inventory levels for given item IDs', async () => {
      const itemIds = [43000000000, 43000000001, 43000000002];
      const levels = await shopify.fetchInventoryLevels(itemIds);

      expect(levels).toHaveLength(itemIds.length);
      for (let i = 0; i < levels.length; i++) {
        expect(levels[i].inventory_item_id).toBe(itemIds[i]);
        expect(typeof levels[i].available).toBe('number');
        expect(levels[i]).toHaveProperty('location_id');
      }
    });

    it('should return empty array for empty input', async () => {
      const levels = await shopify.fetchInventoryLevels([]);
      expect(levels).toHaveLength(0);
    });
  });

  describe('fetchOrder (mock)', () => {
    it('should return an order object with expected properties', async () => {
      const order = await shopify.fetchOrder('5000001001');

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('name');
      expect(order).toHaveProperty('order_number');
      expect(order).toHaveProperty('tags');
      expect(order).toHaveProperty('financial_status');
      expect(order).toHaveProperty('fulfillment_status');
      expect(order).toHaveProperty('fulfillments');
      expect(order.financial_status).toBe('paid');
    });
  });

  describe('fetchOrdersByIds (mock)', () => {
    it('should return an order for each ID', async () => {
      const ids = ['5000001001', '5000001002'];
      const orders = await shopify.fetchOrdersByIds(ids);

      expect(orders).toHaveLength(ids.length);
      for (const order of orders) {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('order_number');
      }
    });
  });
});
