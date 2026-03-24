import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const platform = searchParams.get("platform") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.AssetWhereInput = {};

    if (search) {
      where.influencer = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (status) {
      where.status = status as Prisma.AssetWhereInput["status"];
    }

    if (platform) {
      where.platform = platform as Prisma.AssetWhereInput["platform"];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
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
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({ assets, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const asset = await prisma.asset.create({
      data: body,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Failed to create asset:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
