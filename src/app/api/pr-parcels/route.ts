import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrder, type ShopifyOrderInput } from "@/lib/shopify";
import { withRetry } from "@/lib/shopify-retry";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: "insensitive" } },
        { courierName: { contains: search, mode: "insensitive" } },
        { influencer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const parcels = await prisma.prParcel.findMany({
      where,
      include: {
        influencer: true,
        brand: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(parcels);
  } catch (error) {
    console.error("Failed to fetch PR parcels:", error);
    return NextResponse.json(
      { error: "Failed to fetch PR parcels" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parcel = await prisma.$transaction(async (tx) => {
      const created = await tx.prParcel.create({
        data: {
          influencerId: body.influencerId,
          brandId: body.brandId,
          collaborationId: body.collaborationId || null,
          shippingAddress: body.shippingAddress || null,
          courierName: body.courierName || null,
          trackingNumber: body.trackingNumber || null,
          notes: body.notes || null,
          status: "preparing",
        },
      });

      if (body.items && body.items.length > 0) {
        await tx.prParcelItem.createMany({
          data: body.items.map(
            (item: { productId: string; quantity: number }) => ({
              prParcelId: created.id,
              productId: item.productId,
              quantity: item.quantity || 1,
            })
          ),
        });
      }

      return tx.prParcel.findUnique({
        where: { id: created.id },
        include: {
          influencer: true,
          brand: true,
          items: { include: { product: true } },
        },
      });
    });

    if (!parcel) {
      return NextResponse.json(
        { error: "Failed to create PR parcel" },
        { status: 500 }
      );
    }

    // Auto-create Shopify ₹1 order if products have shopifyVariantId
    const shopifyProducts = parcel.items.filter(
      (item) => item.product.shopifyVariantId || item.product.shopifyProductId
    );

    if (shopifyProducts.length > 0 && parcel.influencer.addressLine1 && parcel.influencer.phone) {
      try {
        const inf = parcel.influencer;

        const lineItems = shopifyProducts.map((item) => ({
          variant_id: item.product.shopifyVariantId
            ? parseInt(item.product.shopifyVariantId)
            : 0,
          product_id:
            !item.product.shopifyVariantId && item.product.shopifyProductId
              ? parseInt(item.product.shopifyProductId)
              : 0,
          quantity: item.quantity,
          price: "1.00",
          title: item.product.name,
        }));

        // Get brand Shopify credentials if available
        const brand = await prisma.brand.findUnique({
          where: { id: parcel.brandId },
          select: {
            shopifyStoreUrl: true,
            shopifyAccessToken: true,
            shopifyApiVersion: true,
          },
        });

        const brandCreds =
          brand?.shopifyStoreUrl && brand?.shopifyAccessToken
            ? {
                storeUrl: brand.shopifyStoreUrl,
                accessToken: brand.shopifyAccessToken,
                apiVersion: brand.shopifyApiVersion || undefined,
              }
            : null;

        const orderInput: ShopifyOrderInput = {
          line_items: lineItems,
          tags: `pr-gifting, influencer, pr-${parcel.id.slice(0, 8)}`,
          note: `PR Parcel for ${inf.name}${inf.instagramHandle ? ` (@${inf.instagramHandle})` : ""} | Parcel ID: ${parcel.id}`,
          shipping_address: {
            first_name: inf.name.split(" ")[0] || inf.name,
            last_name: inf.name.split(" ").slice(1).join(" ") || "",
            address1: inf.addressLine1!,
            address2: inf.addressLine2 || undefined,
            city: inf.city || "",
            province: inf.state || "",
            zip: inf.pincode || "",
            country: inf.country || "India",
            phone: inf.phone || undefined,
          },
          financial_status: "paid",
          send_receipt: false,
          send_fulfillment_receipt: false,
        };

        const orderResult = await withRetry(
          () => createOrder(orderInput, brandCreds),
          { maxRetries: 3, baseDelayMs: 1000 }
        );

        if (orderResult.success && orderResult.result) {
          const order = orderResult.result;
          await prisma.prParcel.update({
            where: { id: parcel.id },
            data: {
              shopifyOrderId: String(order.id),
              shopifyOrderNumber: order.name,
            },
          });
          console.log(
            `[Shopify] PR Parcel order created: ${order.name} after ${orderResult.attempts} attempt(s)`
          );
        } else {
          console.warn(
            `[Shopify] PR Parcel order creation failed after ${orderResult.attempts} attempts: ${orderResult.error}`
          );
        }
      } catch (shopifyError) {
        console.error(
          "[Shopify] PR Parcel order creation failed (non-blocking):",
          shopifyError
        );
      }
    }

    // Refetch to include any Shopify updates
    const finalParcel = await prisma.prParcel.findUnique({
      where: { id: parcel.id },
      include: {
        influencer: true,
        brand: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(finalParcel, { status: 201 });
  } catch (error) {
    console.error("Failed to create PR parcel:", error);
    return NextResponse.json(
      { error: "Failed to create PR parcel" },
      { status: 500 }
    );
  }
}
