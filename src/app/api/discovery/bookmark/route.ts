import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlatformEnum } from "@/features/discovery/lib/influenzer/schema";

// ============================================================
// POST — create a bookmark
// ============================================================

const BookmarkCreateSchema = z.object({
  campaignId: z.string().uuid(),
  platform: PlatformEnum,
  externalUserId: z.string().min(1),
  username: z.string().min(1),
  profileSnapshot: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BookmarkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const bookmark = await prisma.discoveryBookmark.upsert({
      where: {
        campaignId_platform_externalUserId: {
          campaignId: parsed.data.campaignId,
          platform: parsed.data.platform,
          externalUserId: parsed.data.externalUserId,
        },
      },
      update: {
        // update snapshot + note on re-bookmark (cheaper than delete+create)
        username: parsed.data.username,
        profileSnapshot: parsed.data.profileSnapshot as Prisma.InputJsonValue,
        note: parsed.data.note ?? null,
      },
      create: {
        userId: session.user.id as string,
        campaignId: parsed.data.campaignId,
        platform: parsed.data.platform,
        externalUserId: parsed.data.externalUserId,
        username: parsed.data.username,
        profileSnapshot: parsed.data.profileSnapshot as Prisma.InputJsonValue,
        note: parsed.data.note ?? null,
      },
    });

    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    console.error("[/api/discovery/bookmark POST] error:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 },
    );
  }
}

// ============================================================
// GET — list bookmarks (filter by campaignId)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    const where: { campaignId?: string } = {};
    if (campaignId) where.campaignId = campaignId;

    const bookmarks = await prisma.discoveryBookmark.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error("[/api/discovery/bookmark GET] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 },
    );
  }
}
