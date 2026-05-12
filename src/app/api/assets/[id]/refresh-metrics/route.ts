import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchProfile as fetchCreatorX, isCreatorXConfigured } from "@/lib/creatorx";
import {
  fetchInstagramProfileFromBrightData,
  isBrightDataProfileConfigured,
} from "@/lib/brightdata";

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

  if (!isCreatorXConfigured() && !isBrightDataProfileConfigured()) {
    return NextResponse.json(
      {
        error:
          "Neither CreatorX nor Bright Data profile fallback is configured. Set CREATORX_EMAIL + CREATORX_PASSWORD, or BRIGHTDATA_API_TOKEN + BRIGHTDATA_IG_PROFILE_DATASET_ID.",
      },
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

  // Try CreatorX first (richest data — includes audience demographics).
  let source: "creatorx" | "brightdata" = "creatorx";
  let creatorx: Awaited<ReturnType<typeof fetchCreatorX>> = null;
  if (isCreatorXConfigured()) {
    try {
      creatorx = await fetchCreatorX(handle, platform);
    } catch (err) {
      console.warn(
        "[refresh-metrics] CreatorX threw, will try Bright Data fallback:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Fields to write — only include keys whose values are non-null so a
  // partial source (e.g. Bright Data, which can't supply audience demo)
  // doesn't clobber previously-good CreatorX data on the influencer.
  const data: Record<string, unknown> = { metricsLastSyncedAt: new Date() };
  function maybeSet(key: string, value: unknown) {
    if (value !== null && value !== undefined) data[key] = value;
  }

  if (creatorx) {
    maybeSet("igFollowerCount", creatorx.igFollowerCount);
    maybeSet("igFollowingCount", creatorx.igFollowingCount);
    maybeSet("igPostCount", creatorx.igPostCount);
    maybeSet("igEngagementRate", creatorx.igEngagementRate);
    maybeSet("igAudienceMalePct", creatorx.igAudienceMalePct);
    maybeSet("igAudienceFemalePct", creatorx.igAudienceFemalePct);
    maybeSet("igAudienceTopAgeRange", creatorx.igAudienceTopAgeRange);
  } else if (platform === "instagram" && isBrightDataProfileConfigured()) {
    // Bright Data fallback. IG only — BD profile dataset doesn't handle
    // YouTube / TikTok in the same shape.
    try {
      const bd = await fetchInstagramProfileFromBrightData(handle);
      if (bd && bd.igFollowerCount != null) {
        source = "brightdata";
        maybeSet("igFollowerCount", bd.igFollowerCount);
        maybeSet("igFollowingCount", bd.igFollowingCount);
        maybeSet("igPostCount", bd.igPostCount);
        maybeSet("igEngagementRate", bd.igEngagementRate);
        // Audience demographics are NOT in BD basic profile — left untouched
        // so existing CreatorX values stay if they were populated before.
      }
    } catch (err) {
      console.warn(
        "[refresh-metrics] Bright Data fallback failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // If neither source produced any usable data, surface the failure.
  if (Object.keys(data).length <= 1) {
    return NextResponse.json(
      {
        error:
          "No profile data could be fetched. CreatorX returned empty and Bright Data fallback either isn't configured or also returned empty.",
      },
      { status: 502 },
    );
  }

  const updated = await prisma.influencer.update({
    where: { id: asset.influencer.id },
    data,
    select: {
      id: true,
      igFollowerCount: true,
      igEngagementRate: true,
      metricsLastSyncedAt: true,
    },
  });

  return NextResponse.json({
    source,
    profile: creatorx,
    influencer: updated,
  });
}
