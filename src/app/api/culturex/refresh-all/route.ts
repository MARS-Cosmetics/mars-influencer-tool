import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchProfiles } from "@/lib/culturex";

/**
 * POST /api/culturex/refresh-all
 *
 * Weekly cron job to refresh CultureX data for active influencers.
 * Only refreshes influencers that:
 * - Have an Instagram handle
 * - Have collaborations in the last 90 days, OR are in "active" status
 * - Haven't been synced in the last 7 days
 */
export async function POST() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Find influencers that need refresh
    const influencers = await prisma.influencer.findMany({
      where: {
        instagramHandle: { not: null },
        OR: [
          { status: "active" },
          { collaborations: { some: { createdAt: { gte: ninetyDaysAgo } } } },
        ],
        OR: [
          { metricsLastSyncedAt: null },
          { metricsLastSyncedAt: { lt: sevenDaysAgo } },
        ],
      },
      select: {
        id: true,
        instagramHandle: true,
      },
      take: 50, // Process in batches of 50
    });

    if (influencers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No influencers need refresh",
        refreshed: 0,
      });
    }

    // CultureX supports batch requests — send all handles at once
    const handles = influencers
      .map((i) => i.instagramHandle!)
      .filter(Boolean);

    const profiles = await fetchProfiles(handles);

    let updated = 0;
    let failed = 0;

    for (const influencer of influencers) {
      const handle = influencer.instagramHandle!;
      const profile = profiles.get(handle);

      if (!profile) {
        failed++;
        continue;
      }

      try {
        await prisma.influencer.update({
          where: { id: influencer.id },
          data: {
            igFollowerCount: profile.igFollowerCount,
            igFollowingCount: profile.igFollowingCount,
            igPostCount: profile.igPostCount,
            igEngagementRate: profile.igEngagementRate,
            igAvgLikes: profile.igAvgLikes,
            igAvgComments: profile.igAvgComments,
            igAvgReelViews: profile.igAvgReelViews,
            igMedianReelViews: profile.igMedianReelViews,
            igLast8ReelViews: profile.igLast8ReelViews,
            isVerified: profile.isVerified,
            metricsLastSyncedAt: new Date(),
            // Only update these if currently empty
            ...(profile.profileImageUrl ? { profileImageUrl: profile.profileImageUrl } : {}),
          },
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update influencer ${handle}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: influencers.length,
      refreshed: updated,
      failed,
      source: profiles.size > 0 ? "culturex" : "mock",
    });
  } catch (error) {
    console.error("CultureX refresh-all failed:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
