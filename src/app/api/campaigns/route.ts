import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const brandId = searchParams.get("brandId") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10),
      0
    );

    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name,
        brandId: body.brandId,
        description: body.description || null,
        status: body.status || "draft",
        totalBudget: body.totalBudget ? parseFloat(body.totalBudget) : null,
        spentBudget: 0,
        currency: body.currency || "INR",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        goals: body.goals || null,
      },
      include: { brand: true },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "campaign",
        entityId: campaign.id,
        action: "created",
        description: `New campaign created: ${campaign.name || campaign.id}`,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
