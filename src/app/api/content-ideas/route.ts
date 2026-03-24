import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const theme = searchParams.get("theme") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.ContentIdeaWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (theme) {
      where.theme = theme as Prisma.ContentIdeaWhereInput["theme"];
    }

    if (status) {
      where.status = status as Prisma.ContentIdeaWhereInput["status"];
    }

    if (priority) {
      where.priority = priority as Prisma.ContentIdeaWhereInput["priority"];
    }

    const [contentIdeas, total] = await Promise.all([
      prisma.contentIdea.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          brand: {
            select: { id: true, name: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
          influencer: {
            select: { id: true, name: true, instagramHandle: true },
          },
          collaboration: {
            select: { id: true },
          },
        },
      }),
      prisma.contentIdea.count({ where }),
    ]);

    return NextResponse.json({ contentIdeas, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch content ideas:", error);
    return NextResponse.json(
      { error: "Failed to fetch content ideas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert date strings to Date objects
    if (body.targetDate) {
      body.targetDate = new Date(body.targetDate);
    } else {
      delete body.targetDate;
    }

    // Handle referenceUrls - split by newline if string
    if (typeof body.referenceUrls === "string") {
      body.referenceUrls = body.referenceUrls
        .split("\n")
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const contentIdea = await prisma.contentIdea.create({
      data: body,
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        influencer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contentIdea, { status: 201 });
  } catch (error) {
    console.error("Failed to create content idea:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create content idea";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
