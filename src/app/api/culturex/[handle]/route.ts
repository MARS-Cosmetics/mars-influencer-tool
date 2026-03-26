import { NextResponse } from "next/server";
import { fetchProfile, USE_MOCK } from "@/lib/culturex";
import { fetchPublicProfile } from "@/lib/instagram";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ handle: string }> }
) {
  const { handle } = await props.params;
  const cleanHandle = handle.replace(/^@/, "");

  // Check if we already have fresh data (synced in last 24 hours)
  const existing = await prisma.influencer.findFirst({
    where: { instagramHandle: cleanHandle },
    select: {
      igFollowerCount: true,
      igEngagementRate: true,
      metricsLastSyncedAt: true,
    },
  });

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (
    existing?.metricsLastSyncedAt &&
    existing.metricsLastSyncedAt > twentyFourHoursAgo &&
    existing.igFollowerCount
  ) {
    // Return cached data indicator — frontend will use what's in the DB
    return NextResponse.json({
      found: true,
      source: "cached",
      message: "Data synced within last 24 hours. Using cached data.",
      lastSynced: existing.metricsLastSyncedAt,
    });
  }

  // Try CultureX first
  const profile = await fetchProfile(cleanHandle);

  if (profile && profile.found) {
    return NextResponse.json(profile);
  }

  // ===== INSTAGRAM FALLBACK =====
  return instagramFallback(cleanHandle);
}

async function instagramFallback(handle: string) {
  try {
    const profile = await fetchPublicProfile(handle);

    let tier: string;
    if (profile.followerCount < 10000) tier = "nano";
    else if (profile.followerCount < 50000) tier = "micro";
    else if (profile.followerCount < 200000) tier = "mid";
    else if (profile.followerCount < 1000000) tier = "macro";
    else tier = "mega";

    return NextResponse.json({
      found: true,
      source: "instagram_fallback" as const,
      handle: profile.username,
      name: profile.fullName,
      bio: profile.biography,
      profileImageUrl: profile.profilePicUrl,
      igFollowerCount: profile.followerCount,
      igFollowingCount: profile.followingCount,
      igPostCount: profile.postCount,
      igEngagementRate: null,
      igAvgLikes: null,
      igAvgComments: null,
      igAvgReelViews: null,
      igAvgStoryViews: null,
      igMedianReelViews: null,
      igLast8ReelViews: [],
      igCredibilityScore: null,
      igAudienceMalePct: null,
      igAudienceFemalePct: null,
      igAudienceTopAgeRange: null,
      igAudienceTopCities: null,
      igAudienceTopCountries: null,
      categories: [],
      tier,
      recentReels: [],
      lastUpdated: null,
    });
  } catch (error) {
    console.error("Instagram fallback also failed:", error);
    return NextResponse.json(
      { found: false, source: "instagram_fallback" },
      { status: 404 }
    );
  }
}
