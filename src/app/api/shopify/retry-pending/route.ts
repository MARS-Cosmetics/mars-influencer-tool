// POST /api/shopify/retry-pending
// Finds all collaborations with shopifyOrderStatus = 'pending_retry'
// Retries order creation for each
// Called by cron job every 15 minutes

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOrder, ShopifyOrderInput } from '@/lib/shopify';
import { withRetry } from '@/lib/shopify-retry';

export async function POST() {
  const pending = await prisma.collaboration.findMany({
    where: { shopifyOrderStatus: 'pending_retry' },
    include: {
      influencer: true,
      products: { include: { product: true } },
    },
  });

  if (pending.length === 0) {
    return NextResponse.json({ success: true, message: 'No pending orders', retried: 0 });
  }

  let succeeded = 0;
  let failed = 0;

  for (const collab of pending) {
    const inf = collab.influencer;
    const lineItems = collab.products
      .filter((cp: any) => cp.product.shopifyVariantId)
      .map((cp: any) => ({
        variant_id: parseInt(cp.product.shopifyVariantId!),
        quantity: cp.quantity || 1,
        price: '1.00',
      }));

    if (lineItems.length === 0) {
      await prisma.collaboration.update({
        where: { id: collab.id },
        data: { shopifyOrderStatus: 'retry_failed_no_products' },
      });
      failed++;
      continue;
    }

    const nameParts = inf.name.trim().split(/\s+/);
    const orderInput: ShopifyOrderInput = {
      line_items: lineItems,
      tags: `influencer, ${collab.type}, collab-${collab.id.slice(0, 8)}`,
      note: `Influencer: ${inf.name} (@${inf.instagramHandle || ''}) | Retry | Collaboration: ${collab.id}`,
      shipping_address: {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || nameParts[0],
        address1: inf.addressLine1 || '',
        address2: inf.addressLine2 || undefined,
        city: inf.city || '',
        province: inf.state || '',
        zip: inf.pincode || '',
        country: inf.country || 'India',
        phone: inf.phone || undefined,
      },
      financial_status: 'paid',
      send_receipt: false,
      send_fulfillment_receipt: false,
    };

    const result = await withRetry(() => createOrder(orderInput));

    if (result.success && result.result) {
      await prisma.collaboration.update({
        where: { id: collab.id },
        data: {
          shopifyOrderId: String(result.result.id),
          shopifyOrderNumber: result.result.name || `#${result.result.order_number}`,
          shopifyOrderStatus: 'unfulfilled',
        },
      });
      succeeded++;
    } else {
      // Keep as pending_retry for next run, but log the failure
      await prisma.activityLog.create({
        data: {
          entityType: 'collaboration',
          entityId: collab.id,
          action: 'shopify_retry_failed',
          description: `Retry failed: ${result.error}`,
        },
      });
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    retried: pending.length,
    succeeded,
    failed,
  });
}
