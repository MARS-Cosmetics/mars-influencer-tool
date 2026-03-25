/**
 * Shopify Admin API Client
 *
 * Auto-toggles between mock and real API based on environment variables.
 * Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in .env to use real API.
 * Without credentials, returns realistic mock data for development.
 */

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

export const USE_MOCK = !SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN;

function getBaseUrl(): string {
  return `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}`;
}

function getHeaders(): Record<string, string> {
  return {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN!,
    "Content-Type": "application/json",
  };
}

// ============================================================
// Generic Shopify API caller
// ============================================================

async function shopifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Shopify API error (${res.status}): ${error}`);
  }

  return res.json();
}

// ============================================================
// PRODUCTS
// ============================================================

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  status: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  image: ShopifyImage | null;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_item_id: number;
  inventory_quantity: number;
}

export interface ShopifyImage {
  id: number;
  src: string;
}

export async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  if (USE_MOCK) return mockProducts();

  const products: ShopifyProduct[] = [];
  let pageInfo: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const fetchUrl: string = pageInfo
      ? `/products.json?limit=250&page_info=${pageInfo}`
      : `/products.json?limit=250`;

    const res = await fetch(`${getBaseUrl()}${fetchUrl}`, { headers: getHeaders() });
    const data = await res.json();
    products.push(...(data.products || []));

    // Check for pagination
    const linkHeader = res.headers.get("link");
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/page_info=([^>&]*)/);
      pageInfo = match ? match[1] : null;
      hasNext = !!pageInfo;
    } else {
      hasNext = false;
    }
  }

  return products;
}

// ============================================================
// INVENTORY
// ============================================================

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  available: number;
  location_id: number;
}

export async function fetchInventoryLevels(
  inventoryItemIds: number[]
): Promise<ShopifyInventoryLevel[]> {
  if (USE_MOCK) return mockInventoryLevels(inventoryItemIds);

  // Shopify allows max 50 items per request
  const levels: ShopifyInventoryLevel[] = [];
  for (let i = 0; i < inventoryItemIds.length; i += 50) {
    const batch = inventoryItemIds.slice(i, i + 50);
    const data = await shopifyFetch<{ inventory_levels: ShopifyInventoryLevel[] }>(
      `/inventory_levels.json?inventory_item_ids=${batch.join(",")}`
    );
    levels.push(...(data.inventory_levels || []));
  }

  return levels;
}

// ============================================================
// ORDERS
// ============================================================

export interface ShopifyOrderLineItem {
  variant_id: number;
  quantity: number;
  price: string;
  title: string;
}

export interface ShopifyOrderInput {
  line_items: ShopifyOrderLineItem[];
  tags: string;
  note: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone?: string;
  };
  financial_status: string;
  send_receipt: boolean;
  send_fulfillment_receipt: boolean;
}

export interface ShopifyOrder {
  id: number;
  name: string; // e.g., "#1001"
  order_number: number;
  tags: string;
  financial_status: string;
  fulfillment_status: string | null;
  fulfillments: ShopifyFulfillment[];
  created_at: string;
  note: string | null;
}

export interface ShopifyFulfillment {
  id: number;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
}

export async function createOrder(input: ShopifyOrderInput): Promise<ShopifyOrder> {
  if (USE_MOCK) return mockCreateOrder(input);

  const data = await shopifyFetch<{ order: ShopifyOrder }>("/orders.json", {
    method: "POST",
    body: JSON.stringify({ order: input }),
  });

  return data.order;
}

export async function fetchOrder(orderId: string): Promise<ShopifyOrder> {
  if (USE_MOCK) return mockFetchOrder(orderId);

  const data = await shopifyFetch<{ order: ShopifyOrder }>(
    `/orders/${orderId}.json`
  );
  return data.order;
}

export async function fetchOrdersByIds(orderIds: string[]): Promise<ShopifyOrder[]> {
  if (USE_MOCK) return orderIds.map((id) => mockFetchOrder(id));

  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    `/orders.json?ids=${orderIds.join(",")}&status=any`
  );
  return data.orders || [];
}

// ============================================================
// MOCK DATA
// ============================================================

let mockOrderCounter = 1000;

function mockProducts(): ShopifyProduct[] {
  const brands = ["MARS Cosmetics"];
  const categories = ["Lipstick", "Foundation", "Mascara", "Eyeshadow", "Blush", "Primer", "Concealer", "Setting Spray", "Lip Liner", "Bronzer"];
  const shades = ["Natural", "Rose", "Coral", "Nude", "Berry", "Mauve", "Crimson", "Peach"];

  return categories.flatMap((cat, ci) =>
    shades.slice(0, 3 + (ci % 3)).map((shade, si) => {
      const pid = 7000000000 + ci * 100 + si;
      const vid = 40000000000 + ci * 100 + si;
      const iid = 43000000000 + ci * 100 + si;
      return {
        id: pid,
        title: `MARS ${cat} - ${shade}`,
        body_html: `<p>Premium ${cat.toLowerCase()} in ${shade.toLowerCase()} shade</p>`,
        vendor: brands[0],
        product_type: cat,
        status: "active",
        variants: [
          {
            id: vid,
            product_id: pid,
            title: "Default",
            price: (199 + ci * 50 + si * 10).toFixed(2),
            sku: `MARS-${cat.substring(0, 3).toUpperCase()}-${shade.substring(0, 3).toUpperCase()}-${String(ci * 10 + si).padStart(3, "0")}`,
            inventory_item_id: iid,
            inventory_quantity: Math.floor(Math.random() * 500) + 10,
          },
        ],
        images: [
          {
            id: 30000000000 + ci * 100 + si,
            src: `https://placehold.co/400x400/A6192E/white?text=${encodeURIComponent(cat)}`,
          },
        ],
        image: {
          id: 30000000000 + ci * 100 + si,
          src: `https://placehold.co/400x400/A6192E/white?text=${encodeURIComponent(cat)}`,
        },
      };
    })
  );
}

function mockInventoryLevels(itemIds: number[]): ShopifyInventoryLevel[] {
  return itemIds.map((id) => ({
    inventory_item_id: id,
    available: Math.floor(Math.random() * 500) + 10,
    location_id: 1,
  }));
}

function mockCreateOrder(input: ShopifyOrderInput): ShopifyOrder {
  mockOrderCounter++;
  return {
    id: 5000000000 + mockOrderCounter,
    name: `#${mockOrderCounter}`,
    order_number: mockOrderCounter,
    tags: input.tags,
    financial_status: "paid",
    fulfillment_status: null,
    fulfillments: [],
    created_at: new Date().toISOString(),
    note: input.note,
  };
}

function mockFetchOrder(orderId: string): ShopifyOrder {
  const id = parseInt(orderId) || 5000001001;
  const statuses = [null, "partial", "fulfilled"];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  return {
    id,
    name: `#${id - 5000000000}`,
    order_number: id - 5000000000,
    tags: "influencer,paid",
    financial_status: "paid",
    fulfillment_status: randomStatus,
    fulfillments: randomStatus === "fulfilled"
      ? [
          {
            id: id + 100,
            status: "success",
            tracking_number: `TRACK${id}`,
            tracking_url: `https://track.example.com/${id}`,
            tracking_company: "Delhivery",
          },
        ]
      : [],
    created_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    note: "Influencer collaboration order",
  };
}
