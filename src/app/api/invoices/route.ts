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

    const where: Prisma.InvoiceWhereInput = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { influencer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status as Prisma.InvoiceWhereInput["status"];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
          verifier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert numeric strings
    const decimalFields = ["amount", "taxAmount", "totalAmount"];
    for (const field of decimalFields) {
      if (body[field] !== undefined && body[field] !== "") {
        body[field] = parseFloat(body[field]);
      } else {
        delete body[field];
      }
    }

    // Handle dates
    if (body.invoiceDate) {
      body.invoiceDate = new Date(body.invoiceDate);
    }
    if (body.dueDate) {
      body.dueDate = new Date(body.dueDate);
    } else {
      delete body.dueDate;
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const invoice = await prisma.invoice.create({
      data: body,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
