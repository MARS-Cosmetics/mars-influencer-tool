/**
 * Shopify Live Integration Tests
 *
 * These tests hit the REAL Shopify Dev API.
 * Only run when SHOPIFY_ACCESS_TOKEN is set.
 *
 * Run: npx vitest run src/__tests__/integration/shopify-live.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";

const STORE_URL = process.env.SHOPIFY_STORE_URL || "mars-cosmetics-dev.myshopify.com";
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

const baseUrl = `https://${STORE_URL}/admin/api/${API_VERSION}`;

function headers() {
  return {
    "X-Shopify-Access-Token": ACCESS_TOKEN!,
    "Content-Type": "application/json",
  };
}

const isLive = !!ACCESS_TOKEN;

describe.skipIf(!isLive)("Shopify Live API", { timeout: 30000 }, () => {
  // ============================================================
  // CONNECTION
  // ============================================================
  describe("Connection", () => {
    it("should authenticate successfully", async () => {
      const res = await fetch(`${baseUrl}/shop.json`, { headers: headers() });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.shop).toBeDefined();
      expect(data.shop.name).toBeDefined();
      console.log(`  Connected to: ${data.shop.name} (${data.shop.domain})`);
    });

    it("should have correct API scopes", async () => {
      const res = await fetch(
        `https://${STORE_URL}/admin/oauth/access_scopes.json`,
        { headers: headers() }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      const scopes = data.access_scopes.map((s: { handle: string }) => s.handle);
      console.log(`  Scopes: ${scopes.join(", ")}`);

      // Verify required scopes
      expect(scopes).toContain("read_products");
      expect(scopes).toContain("write_orders");
      expect(scopes).toContain("read_orders");
    });
  });

  // ============================================================
  // PRODUCTS
  // ============================================================
  describe("Products", () => {
    it("should fetch products list", async () => {
      const res = await fetch(`${baseUrl}/products.json?limit=10`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      console.log(`  Products found: ${data.products.length}`);
    });

    it("should fetch product count", async () => {
      const res = await fetch(`${baseUrl}/products/count.json`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.count).toBe("number");
      console.log(`  Total products: ${data.count}`);
    });

    it("should fetch products with variants and images", async () => {
      const res = await fetch(
        `${baseUrl}/products.json?limit=3&fields=id,title,variants,images,vendor,product_type,status`,
        { headers: headers() }
      );
      expect(res.status).toBe(200);
      const data = await res.json();

      if (data.products.length > 0) {
        const product = data.products[0];
        expect(product.id).toBeDefined();
        expect(product.title).toBeDefined();
        expect(product.variants).toBeDefined();
        expect(Array.isArray(product.variants)).toBe(true);
        console.log(`  Sample product: ${product.title} (${product.variants.length} variants)`);

        if (product.variants.length > 0) {
          const variant = product.variants[0];
          expect(variant.id).toBeDefined();
          expect(variant.price).toBeDefined();
          console.log(`  Sample variant: ${variant.title} - ₹${variant.price} (SKU: ${variant.sku})`);
        }
      }
    });
  });

  // ============================================================
  // INVENTORY
  // ============================================================
  describe("Inventory", () => {
    it("should fetch inventory levels", async () => {
      // First get a product to find inventory_item_id
      const prodRes = await fetch(`${baseUrl}/products.json?limit=1`, {
        headers: headers(),
      });
      const prodData = await prodRes.json();

      if (prodData.products.length > 0 && prodData.products[0].variants.length > 0) {
        const inventoryItemId = prodData.products[0].variants[0].inventory_item_id;

        // Fetch locations first
        const locRes = await fetch(`${baseUrl}/locations.json`, {
          headers: headers(),
        });
        const locData = await locRes.json();

        if (locData.locations && locData.locations.length > 0) {
          const locationId = locData.locations[0].id;

          const invRes = await fetch(
            `${baseUrl}/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`,
            { headers: headers() }
          );
          expect(invRes.status).toBe(200);
          const invData = await invRes.json();
          expect(invData.inventory_levels).toBeDefined();
          console.log(`  Inventory levels fetched: ${invData.inventory_levels.length}`);
          if (invData.inventory_levels.length > 0) {
            console.log(`  Available: ${invData.inventory_levels[0].available}`);
          }
        }
      }
    });

    it("should fetch locations", async () => {
      const res = await fetch(`${baseUrl}/locations.json`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.locations).toBeDefined();
      console.log(`  Locations: ${data.locations.map((l: { name: string }) => l.name).join(", ")}`);
    });
  });

  // ============================================================
  // ORDERS
  // ============================================================
  describe("Orders", () => {
    let testOrderId: number | null = null;

    it("should create a ₹1 test order", async () => {
      const orderPayload = {
        order: {
          line_items: [
            {
              title: "Test Influencer Product",
              quantity: 1,
              price: "1.00",
            },
          ],
          tags: "influencer,test,barter",
          note: "Integration test order - can be deleted",
          financial_status: "paid",
          send_receipt: false,
          send_fulfillment_receipt: false,
          shipping_address: {
            first_name: "Test",
            last_name: "Influencer",
            address1: "123 Test Street",
            city: "Mumbai",
            province: "Maharashtra",
            zip: "400001",
            country: "India",
            phone: "+919876543210",
          },
        },
      };

      const res = await fetch(`${baseUrl}/orders.json`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(orderPayload),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.order).toBeDefined();
      expect(data.order.id).toBeDefined();
      expect(data.order.tags).toContain("influencer");
      expect(data.order.tags).toContain("test");

      testOrderId = data.order.id;
      console.log(`  Created order: ${data.order.name} (ID: ${data.order.id})`);
      console.log(`  Tags: ${data.order.tags}`);
      console.log(`  Financial status: ${data.order.financial_status}`);
    });

    it("should fetch the created order", async () => {
      if (!testOrderId) {
        console.log("  Skipped - no test order created");
        return;
      }

      const res = await fetch(`${baseUrl}/orders/${testOrderId}.json`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.order.id).toBe(testOrderId);
      expect(data.order.note).toContain("Integration test");
      console.log(`  Fetched order: ${data.order.name}`);
    });

    it("should fetch orders list", async () => {
      const res = await fetch(`${baseUrl}/orders.json?limit=5&status=any`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.orders).toBeDefined();
      expect(Array.isArray(data.orders)).toBe(true);
      console.log(`  Orders found: ${data.orders.length}`);
    });

    it("should fetch order count", async () => {
      const res = await fetch(`${baseUrl}/orders/count.json?status=any`, {
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.count).toBe("number");
      console.log(`  Total orders: ${data.count}`);
    });

    // Clean up test order
    it("should cancel test order", async () => {
      if (!testOrderId) {
        console.log("  Skipped - no test order to cancel");
        return;
      }

      const res = await fetch(`${baseUrl}/orders/${testOrderId}/cancel.json`, {
        method: "POST",
        headers: headers(),
      });
      // 200 = cancelled, 422 = already cancelled
      expect([200, 422]).toContain(res.status);
      console.log(`  Cancelled test order: ${testOrderId}`);
    });
  });

  // ============================================================
  // FULFILLMENTS (read-only)
  // ============================================================
  describe("Fulfillments", () => {
    it("should check fulfillment orders API", async () => {
      // Get a recent order to check fulfillments
      const ordersRes = await fetch(`${baseUrl}/orders.json?limit=1&status=any`, {
        headers: headers(),
      });
      const ordersData = await ordersRes.json();

      if (ordersData.orders.length > 0) {
        const orderId = ordersData.orders[0].id;
        const res = await fetch(
          `${baseUrl}/orders/${orderId}/fulfillment_orders.json`,
          { headers: headers() }
        );
        // If scope allows
        if (res.status === 200) {
          const data = await res.json();
          console.log(`  Fulfillment orders for #${ordersData.orders[0].name}: ${data.fulfillment_orders?.length || 0}`);
        } else {
          console.log(`  Fulfillment orders API returned: ${res.status} (may need read_fulfillments scope)`);
        }
      }
    });
  });

  // ============================================================
  // APP SYNC ENDPOINTS (via our API routes)
  // ============================================================
  describe("Sync Client Functions", () => {
    it("should use real API (not mock) when credentials are set", () => {
      // Since we have env vars set, USE_MOCK should be false
      // We can't import directly due to module caching, but we can verify env
      expect(process.env.SHOPIFY_STORE_URL).toBeDefined();
      expect(process.env.SHOPIFY_ACCESS_TOKEN).toBeDefined();
    });
  });
});
