import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
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
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Failed to fetch asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
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

    // Convert performance metrics to integers
    const intFields = ["views", "likes", "comments", "shares", "saves", "reach", "impressions"];
    for (const field of intFields) {
      if (body[field] !== undefined && body[field] !== "") {
        body[field] = parseInt(body[field], 10);
      } else if (body[field] === "") {
        body[field] = null;
      }
    }

    // Convert decimal fields
    if (body.contentRating !== undefined && body.contentRating !== "") {
      body.contentRating = parseFloat(body.contentRating);
    } else if (body.contentRating === "") {
      body.contentRating = null;
    }

    // Handle publishedAt
    if (body.publishedAt) {
      body.publishedAt = new Date(body.publishedAt);
    } else if (body.publishedAt === "") {
      body.publishedAt = null;
    }

    // Handle ratingTags
    if (typeof body.ratingTags === "string") {
      body.ratingTags = body.ratingTags
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    // Handle dueDate
    if (body.dueDate) {
      body.dueDate = new Date(body.dueDate);
    } else if (body.dueDate === "") {
      body.dueDate = null;
    }

    // Handle hasAdRights
    if (body.hasAdRights !== undefined) {
      body.hasAdRights = body.hasAdRights === true || body.hasAdRights === "true";
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: body,
    });

    // Auto-recompute collaboration dueDate from latest asset dueDate
    if (asset.collaborationId && body.dueDate !== undefined) {
      const allAssets = await prisma.asset.findMany({
        where: { collaborationId: asset.collaborationId },
        select: { dueDate: true },
      });

      const dueDates = allAssets
        .map((a) => a.dueDate)
        .filter((d): d is Date => d !== null);

      const latestDueDate = dueDates.length > 0
        ? new Date(Math.max(...dueDates.map((d) => d.getTime())))
        : null;

      await prisma.collaboration.update({
        where: { id: asset.collaborationId },
        data: { dueDate: latestDueDate },
      });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Failed to update asset:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
