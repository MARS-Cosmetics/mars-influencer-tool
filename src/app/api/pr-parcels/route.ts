import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    return NextResponse.json(parcel, { status: 201 });
  } catch (error) {
    console.error("Failed to create PR parcel:", error);
    return NextResponse.json(
      { error: "Failed to create PR parcel" },
      { status: 500 }
    );
  }
}
