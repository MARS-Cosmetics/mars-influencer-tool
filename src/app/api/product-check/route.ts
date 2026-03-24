import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const influencerId = searchParams.get("influencerId");
    const productId = searchParams.get("productId");

    if (!influencerId || !productId) {
      return NextResponse.json({ error: "influencerId and productId are required" }, { status: 400 });
    }

    // Check in CollaborationProduct
    const collabProducts = await prisma.collaborationProduct.findMany({
      where: {
        productId,
        collaboration: { influencerId },
      },
      include: {
        collaboration: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            brand: { select: { name: true } },
          },
        },
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check in PrParcelItem
    const prParcelItems = await prisma.prParcelItem.findMany({
      where: {
        productId,
        prParcel: { influencerId },
      },
      include: {
        prParcel: {
          select: {
            id: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
            createdAt: true,
            brand: { select: { name: true } },
          },
        },
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const hasDuplicate = collabProducts.length > 0 || prParcelItems.length > 0;

    return NextResponse.json({
      hasDuplicate,
      totalOccurrences: collabProducts.length + prParcelItems.length,
      collaborations: collabProducts.map((cp) => ({
        collaborationId: cp.collaboration.id,
        type: cp.collaboration.type,
        status: cp.collaboration.status,
        brand: cp.collaboration.brand.name,
        date: cp.collaboration.createdAt,
        quantity: cp.quantity,
      })),
      prParcels: prParcelItems.map((pi) => ({
        parcelId: pi.prParcel.id,
        status: pi.prParcel.status,
        brand: pi.prParcel.brand.name,
        shippedAt: pi.prParcel.shippedAt,
        deliveredAt: pi.prParcel.deliveredAt,
        date: pi.prParcel.createdAt,
        quantity: pi.quantity,
      })),
      productName: collabProducts[0]?.product.name || prParcelItems[0]?.product.name || null,
    });
  } catch (error) {
    console.error("Product check failed:", error);
    return NextResponse.json({ error: "Product check failed" }, { status: 500 });
  }
}
