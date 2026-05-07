import { NextResponse } from "next/server";
import { fetchProfile as fetchCultureX, USE_MOCK as CULTUREX_IS_MOCK } from "@/lib/culturex";
import {
  fetchProfile as fetchCreatorX,
  isCreatorXConfigured,
  CreatorXError,
} from "@/lib/creatorx";
import { fetchCreatorDetails } from "@/features/discovery/lib/influenzer/profile";
import { InfluenzerError } from "@/features/discovery/lib/influenzer/auth";
import { fetchPublicProfile } from "@/lib/instagram";
import { prisma } from "@/lib/db";

function tierFromFollowers(n: number): string {
  if (n < 10_000) return "nano";
  if (n < 50_000) return "micro";
  if (n < 200_000) return "mid";
  if (n < 1_000_000) return "macro";
  return "mega";
}

export async function GET(
  _request: Request,
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
    return NextResponse.json({
      found: true,
      source: "cached",
      message: "Data synced within last 24 hours. Using cached data.",
      lastSynced: existing.metricsLastSyncedAt,
    });
  }

  // Try Influenzer (CreatorX) first when configured.
  if (isCreatorXConfigured()) {
    // Step 1: fetchCreatorDetails (the discover-page detail panel's path).
    // It hits the SAME /analytics/profile endpoint but has been verified
    // working with audience demographics on the discover side. unlock=true
    // so the audience report actually populates.
    let detailsAudience: Awaited<ReturnType<typeof fetchCreatorDetails>> | null = null;
    try {
      detailsAudience = await fetchCreatorDetails("instagram", cleanHandle, {
        unlock: true,
      });
    } catch (err) {
      if (err instanceof InfluenzerError) {
        // 429 = profile-report quota exhausted (separate from search credits).
        // 403 = entitlement / out of credits. Surface these — don't silently
        // fall through to a less-rich data source.
        if (err.status === 429 || err.status === 403) {
          return NextResponse.json(
            {
              found: false,
              source: "creatorx_error",
              error: `Influenzer: ${err.message}`,
              status: err.status,
            },
            { status: err.status },
          );
        }
        // 404 / other → log and continue to step 2 below
        console.warn(
          `[culturex/handle] fetchCreatorDetails failed (${err.status}): ${err.message}`,
        );
      } else {
        console.error("[culturex/handle] unexpected fetchCreatorDetails error:", err);
      }
    }

    // Step 2: also call the legacy creatorx.fetchProfile — it adds a filter
    // -endpoint headline-metrics fallback and a credibility-score probe
    // that fetchCreatorDetails doesn't do. Merge results.
    let creatorxResult: Awaited<ReturnType<typeof fetchCreatorX>> | null = null;
    try {
      creatorxResult = await fetchCreatorX(cleanHandle);
    } catch (err) {
      if (err instanceof CreatorXError) {
        // If we already have audience data from step 1, ignore this; else surface.
        if (!detailsAudience) {
          return NextResponse.json(
            {
              found: false,
              source: "creatorx_error",
              error: `Influenzer: ${err.message}`,
              status: err.status,
            },
            { status: err.status === 429 || err.status === 403 ? 429 : 502 },
          );
        }
      } else {
        console.error("[culturex/handle] unexpected CreatorX error:", err);
      }
    }

    // Merge: prefer creatorxResult fields when present (it has filter-API
    // headline-metric fallback and credibility), fill gaps from detailsAudience.
    if (creatorxResult || detailsAudience) {
      const followers =
        creatorxResult?.igFollowerCount ||
        detailsAudience?.followers ||
        0;

      const merged = {
        ...(creatorxResult ?? {}),
        found: true as const,
        source: "creatorx" as const,
        handle: detailsAudience?.handle ?? creatorxResult?.handle ?? cleanHandle,
        name:
          detailsAudience?.fullname ??
          creatorxResult?.name ??
          cleanHandle,
        bio: detailsAudience?.bio ?? creatorxResult?.bio ?? null,
        profileImageUrl:
          detailsAudience?.picture ??
          creatorxResult?.profileImageUrl ??
          null,
        isVerified:
          detailsAudience?.isVerified ?? creatorxResult?.isVerified ?? false,
        igFollowerCount: followers,
        igFollowingCount:
          creatorxResult?.igFollowingCount ||
          detailsAudience?.following ||
          0,
        igPostCount:
          creatorxResult?.igPostCount || detailsAudience?.posts || 0,
        igEngagementRate:
          creatorxResult?.igEngagementRate ??
          detailsAudience?.engagementRate ??
          null,
        // Audience demographics — from fetchCreatorDetails (the working path)
        igAudienceMalePct:
          detailsAudience?.audienceGenderMale ??
          creatorxResult?.igAudienceMalePct ??
          null,
        igAudienceFemalePct:
          detailsAudience?.audienceGenderFemale ??
          creatorxResult?.igAudienceFemalePct ??
          null,
        igAudienceTopAgeRange:
          detailsAudience?.audienceAgeGroups?.[0]?.code ??
          creatorxResult?.igAudienceTopAgeRange ??
          null,
        igAudienceAgeBreakdown:
          detailsAudience?.audienceAgeGroups?.length
            ? Object.fromEntries(
                detailsAudience.audienceAgeGroups.map((g) => [g.code, g.pct]),
              )
            : (creatorxResult?.igAudienceAgeBreakdown ?? null),
        igAudienceTopCountries:
          detailsAudience?.audienceTopCountries?.length
            ? Object.fromEntries(
                detailsAudience.audienceTopCountries.map((c) => [c.name, c.pct]),
              )
            : (creatorxResult?.igAudienceTopCountries ?? null),
        igAudienceTopCities:
          detailsAudience?.audienceTopCities?.length
            ? Object.fromEntries(
                detailsAudience.audienceTopCities.map((c) => [c.name, c.pct]),
              )
            : (creatorxResult?.igAudienceTopCities ?? null),
        // Reels
        igAvgReelViews:
          detailsAudience?.avgReelViews ??
          creatorxResult?.igAvgReelViews ??
          null,
        igMedianReelViews:
          detailsAudience?.medianReelViews ??
          creatorxResult?.igMedianReelViews ??
          null,
        igLast8ReelViews:
          (detailsAudience?.lastReelViews?.length
            ? detailsAudience.lastReelViews
            : creatorxResult?.igLast8ReelViews) ?? [],
        tier: tierFromFollowers(followers),
      };
      return NextResponse.json(merged);
    }
  }

  // Only call CultureX if it's actually configured. The mock implementation
  // returns deterministic FAKE numbers based on the handle string, which
  // looks like real data and misleads users.
  if (!CULTUREX_IS_MOCK) {
    const profile = await fetchCultureX(cleanHandle);
    if (profile && profile.found) {
      return NextResponse.json(profile);
    }
  }

  // Last resort: Instagram public profile scrape (basic counts only)
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
