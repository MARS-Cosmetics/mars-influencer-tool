import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchProfile as fetchCreatorX, isCreatorXConfigured } from "@/lib/creatorx";

/**
 * Refresh the influencer-level profile metrics tied to this asset by calling
 * the CreatorX /analytics/profile endpoint. Per-post metrics (views/likes on
 * the specific reel) are NOT available from that endpoint — callers should
 * continue to edit those on the asset record directly.
 */
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCreatorXConfigured()) {
    return NextResponse.json(
      { error: "CreatorX not configured. Set CREATORX_EMAIL and CREATORX_PASSWORD." },
      { status: 503 },
    );
  }

  const { id } = await props.params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      platform: true,
      influencer: {
        select: {
          id: true,
          instagramHandle: true,
          youtubeHandle: true,
          tiktokHandle: true,
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const platformMap: Record<string, "instagram" | "youtube" | "tiktok"> = {
    instagram: "instagram",
    youtube: "youtube",
    tiktok: "tiktok",
  };
  const platform = platformMap[asset.platform];

  const handle =
    platform === "instagram"
      ? asset.influencer.instagramHandle
      : platform === "youtube"
        ? asset.influencer.youtubeHandle
        : platform === "tiktok"
          ? asset.influencer.tiktokHandle
          : null;

  if (!platform || !handle) {
    return NextResponse.json(
      {
        error:
          "CreatorX refresh only supports instagram / youtube / tiktok and requires a handle on the influencer.",
      },
      { status: 400 },
    );
  }

  const profile = await fetchCreatorX(handle, platform);
  if (!profile) {
    return NextResponse.json(
      { error: "CreatorX returned no data for this handle" },
      { status: 502 },
    );
  }

  const updated = await prisma.influencer.update({
    where: { id: asset.influencer.id },
    data: {
      igFollowerCount: profile.igFollowerCount,
      igFollowingCount: profile.igFollowingCount,
      igPostCount: profile.igPostCount,
      igEngagementRate: profile.igEngagementRate,
      igAudienceMalePct: profile.igAudienceMalePct,
      igAudienceFemalePct: profile.igAudienceFemalePct,
      igAudienceTopAgeRange: profile.igAudienceTopAgeRange,
      metricsLastSyncedAt: new Date(),
    },
    select: {
      id: true,
      igFollowerCount: true,
      igEngagementRate: true,
      metricsLastSyncedAt: true,
    },
  });

  return NextResponse.json({
    source: "creatorx",
    profile,
    influencer: updated,
  });
}
