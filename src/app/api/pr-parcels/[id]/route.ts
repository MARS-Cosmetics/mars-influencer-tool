import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parcel = await prisma.prParcel.findUnique({
      where: { id },
      include: {
        influencer: true,
        brand: true,
        collaboration: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: "PR Parcel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(parcel);
  } catch (error) {
    console.error("Failed to fetch PR parcel:", error);
    return NextResponse.json(
      { error: "Failed to fetch PR parcel" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.shippingAddress !== undefined) data.shippingAddress = body.shippingAddress;
    if (body.courierName !== undefined) data.courierName = body.courierName;
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber;
    if (body.shippedAt !== undefined) data.shippedAt = body.shippedAt ? new Date(body.shippedAt) : null;
    if (body.deliveredAt !== undefined) data.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null;

    const parcel = await prisma.prParcel.update({
      where: { id },
      data,
      include: {
        influencer: true,
        brand: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(parcel);
  } catch (error) {
    console.error("Failed to update PR parcel:", error);
    return NextResponse.json(
      { error: "Failed to update PR parcel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      await tx.prParcelItem.deleteMany({ where: { prParcelId: id } });
      await tx.prParcel.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete PR parcel:", error);
    return NextResponse.json(
      { error: "Failed to delete PR parcel" },
      { status: 500 }
    );
  }
}
