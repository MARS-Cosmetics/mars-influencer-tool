import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const contractType = searchParams.get("contractType") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.ContractWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { influencer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status as Prisma.ContractWhereInput["status"];
    }

    if (contractType) {
      where.contractType = contractType as Prisma.ContractWhereInput["contractType"];
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          influencer: { select: { id: true, name: true, instagramHandle: true } },
          brand: { select: { id: true, name: true } },
          collaboration: { select: { id: true, type: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.contract.count({ where }),
    ]);

    return NextResponse.json({ contracts, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert numeric strings
    if (body.contractValue !== undefined && body.contractValue !== "") {
      body.contractValue = parseFloat(body.contractValue);
    } else {
      delete body.contractValue;
    }

    if (body.expiryAlertDays !== undefined && body.expiryAlertDays !== "") {
      body.expiryAlertDays = parseInt(body.expiryAlertDays, 10);
    } else {
      delete body.expiryAlertDays;
    }

    // Handle dates
    if (body.startDate) {
      body.startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      body.endDate = new Date(body.endDate);
    }

    // Handle boolean
    if (typeof body.autoRenew === "string") {
      body.autoRenew = body.autoRenew === "true";
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const contract = await prisma.contract.create({
      data: body,
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Failed to create contract:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
