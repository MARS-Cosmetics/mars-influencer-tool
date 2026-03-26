import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const { rating, ratingTags, ratingNotes, ratedBy } = body;

    // Validate rating is 1-5
    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "Rating is required" },
        { status: 400 }
      );
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate ratingTags is an array of strings
    if (ratingTags && !Array.isArray(ratingTags)) {
      return NextResponse.json(
        { error: "ratingTags must be an array of strings" },
        { status: 400 }
      );
    }

    // Check asset exists
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Content URL must be attached before rating
    if (!existing.contentUrl) {
      return NextResponse.json(
        { error: "A live content URL must be attached to this asset before it can be rated" },
        { status: 400 }
      );
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        contentRating: ratingNum,
        ratingTags: ratingTags || [],
        ratingNotes: ratingNotes || null,
      },
    });

    const oldRating = String(existing.contentRating ?? "");
    const newRating = String(updatedAsset.contentRating ?? "");
    if (oldRating !== newRating) {
      await prisma.activityLog.create({
        data: {
          entityType: "asset",
          entityId: id,
          action: "field_update",
          field: "contentRating",
          oldValue: oldRating,
          newValue: newRating,
          description: `contentRating updated`,
        },
      });
    }

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Error rating asset:", error);
    return NextResponse.json(
      { error: "Failed to rate asset" },
      { status: 500 }
    );
  }
}
