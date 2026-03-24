import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        influencer: { select: { id: true, name: true, instagramHandle: true } },
        collaboration: {
          select: {
            id: true,
            type: true,
            brand: { select: { name: true } },
          },
        },
        invoice: { select: { id: true, invoiceNumber: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Failed to fetch payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Convert numeric strings
    const decimalFields = ["amount", "tdsPercentage", "tdsAmount", "netAmount"];
    for (const field of decimalFields) {
      if (body[field] !== undefined && body[field] !== "") {
        body[field] = parseFloat(body[field]);
      } else if (body[field] === "") {
        body[field] = null;
      }
    }

    // Handle paidAt
    if (body.paidAt) {
      body.paidAt = new Date(body.paidAt);
    } else if (body.paidAt === "") {
      body.paidAt = null;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Failed to update payment:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
