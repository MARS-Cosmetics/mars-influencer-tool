import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrder, ShopifyOrderInput } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collaborationId } = body;

    if (!collaborationId) {
      return NextResponse.json(
        { error: "collaborationId is required" },
        { status: 400 }
      );
    }

    // Fetch collaboration with influencer and products
    const collaboration = await prisma.collaboration.findUnique({
      where: { id: collaborationId },
      include: {
        influencer: true,
        products: {
          include: { product: true },
        },
      },
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: "Collaboration not found" },
        { status: 404 }
      );
    }

    // Validate status
    if (collaboration.status !== "confirmed") {
      return NextResponse.json(
        { error: `Collaboration must be in "confirmed" status. Current: "${collaboration.status}"` },
        { status: 400 }
      );
    }

    // Validate products
    if (!collaboration.products || collaboration.products.length === 0) {
      return NextResponse.json(
        { error: "Collaboration has no products assigned" },
        { status: 400 }
      );
    }

    // Validate influencer address
    const inf = collaboration.influencer;
    if (!inf.addressLine1 || !inf.city || !inf.state || !inf.pincode) {
      return NextResponse.json(
        { error: "Influencer must have a complete shipping address (addressLine1, city, state, pincode)" },
        { status: 400 }
      );
    }

    // Build line items
    const line_items = collaboration.products.map((cp) => {
      const variantId = cp.product.shopifyVariantId;
      if (!variantId) {
        throw new Error(`Product "${cp.product.name}" has no Shopify variant ID. Sync products first.`);
      }
      return {
        variant_id: parseInt(variantId, 10),
        quantity: cp.quantity,
        price: "1.00",
        title: cp.product.name,
      };
    });

    // Build tags (Shopify doesn't allow colons in tags)
    const tags = `influencer, ${collaboration.type}, collab-${collaboration.id}`;

    // Build note
    const handle = inf.instagramHandle || inf.youtubeHandle || "unknown";
    const note = `Influencer: ${inf.name} (@${handle}) | Collaboration: ${collaboration.id}`;

    // Split name for shipping address
    const nameParts = inf.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

    const orderInput: ShopifyOrderInput = {
      line_items,
      tags,
      note,
      shipping_address: {
        first_name: firstName,
        last_name: lastName,
        address1: inf.addressLine1,
        address2: inf.addressLine2 || undefined,
        city: inf.city,
        province: inf.state,
        zip: inf.pincode,
        country: inf.country || "India",
        phone: inf.phone || undefined,
      },
      financial_status: "paid",
      send_receipt: false,
      send_fulfillment_receipt: false,
    };

    const order = await createOrder(orderInput);

    // Update collaboration with order details
    await prisma.collaboration.update({
      where: { id: collaborationId },
      data: {
        shopifyOrderId: String(order.id),
        shopifyOrderNumber: order.name,
        shopifyOrderStatus: order.fulfillment_status || "unfulfilled",
        shopifyLastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        name: order.name,
        orderNumber: order.order_number,
        fulfillmentStatus: order.fulfillment_status,
        tags: order.tags,
        createdAt: order.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create order failed:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
