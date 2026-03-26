import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.PaymentWhereInput = {};

    if (search) {
      where.influencer = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (status) {
      where.status = status as Prisma.PaymentWhereInput["status"];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert numeric strings
    if (body.amount !== undefined && body.amount !== "") {
      body.amount = parseFloat(body.amount);
    }
    if (body.tdsPercentage !== undefined && body.tdsPercentage !== "") {
      body.tdsPercentage = parseFloat(body.tdsPercentage);
    }
    if (body.tdsAmount !== undefined && body.tdsAmount !== "") {
      body.tdsAmount = parseFloat(body.tdsAmount);
    }
    if (body.netAmount !== undefined && body.netAmount !== "") {
      body.netAmount = parseFloat(body.netAmount);
    }
    if (body.agencyCommissionPct !== undefined && body.agencyCommissionPct !== "") {
      body.agencyCommissionPct = parseFloat(body.agencyCommissionPct);
    }
    if (body.agencyCommissionAmount !== undefined && body.agencyCommissionAmount !== "") {
      body.agencyCommissionAmount = parseFloat(body.agencyCommissionAmount);
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const payment = await prisma.payment.create({
      data: body,
    });

    await prisma.activityLog.create({
      data: {
        entityType: "payment",
        entityId: payment.id,
        action: "created",
        description: `New payment created: ${payment.id}`,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Failed to create payment:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
