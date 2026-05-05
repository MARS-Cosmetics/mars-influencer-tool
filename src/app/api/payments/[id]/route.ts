import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { logFieldDiffs, logDelete } from "@/lib/activity-log";

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

    const previous = await prisma.payment.findUnique({
      where: { id },
      select: { status: true, amount: true },
    });

    const payment = await prisma.payment.update({
      where: { id },
      data: body,
    });

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    void logFieldDiffs(
      userId,
      "payment",
      id,
      previous as Record<string, unknown> | null,
      payment as unknown as Record<string, unknown>,
      ["status", "amount"],
    );

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
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const { id } = await params;

    await prisma.payment.delete({
      where: { id },
    });

    void logDelete(userId, "payment", id, "Deleted payment");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
