import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateEarnedMediaValue } from "@/lib/viral-detection";

export async function GET() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch viral assets from last 90 days
    const viralAssets = await prisma.asset.findMany({
      where: {
        isViral: true,
        viralDetectedAt: { gte: ninetyDaysAgo },
      },
      include: {
        influencer: {
          select: { id: true, name: true, instagramHandle: true },
        },
        collaboration: {
          select: {
            id: true,
            campaign: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { viralMultiplier: "desc" },
    });

    // Summary calculations
    const totalViral = viralAssets.length;
    const avgMultiplier =
      totalViral > 0
        ? Math.round(
            (viralAssets.reduce(
              (sum, a) => sum + (a.viralMultiplier ? Number(a.viralMultiplier) : 0),
              0
            ) /
              totalViral) *
              100
          ) / 100
        : 0;

    // Top platform
    const platformCounts: Record<string, number> = {};
    for (const asset of viralAssets) {
      platformCounts[asset.platform] =
        (platformCounts[asset.platform] || 0) + 1;
    }
    const topPlatform =
      Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    // Total earned media value
    const totalEarnedMediaValue = viralAssets.reduce(
      (sum, asset) => sum + calculateEarnedMediaValue(asset),
      0
    );

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allViralForTrend = await prisma.asset.findMany({
      where: {
        isViral: true,
        viralDetectedAt: { gte: sixMonthsAgo },
      },
      select: {
        viralDetectedAt: true,
        viralMultiplier: true,
      },
    });

    const monthlyMap: Record<
      string,
      { count: number; totalMultiplier: number }
    > = {};
    for (const asset of allViralForTrend) {
      if (!asset.viralDetectedAt) continue;
      const date = new Date(asset.viralDetectedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { count: 0, totalMultiplier: 0 };
      }
      monthlyMap[key].count++;
      monthlyMap[key].totalMultiplier += asset.viralMultiplier
        ? Number(asset.viralMultiplier)
        : 0;
    }

    const monthlyTrend = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        viralCount: data.count,
        avgMultiplier:
          Math.round((data.totalMultiplier / data.count) * 100) / 100,
      }));

    // Top 5 influencers by viral content count
    const influencerMap: Record<
      string,
      {
        id: string;
        name: string;
        handle: string | null;
        viralCount: number;
        totalMultiplier: number;
      }
    > = {};
    for (const asset of viralAssets) {
      const inf = asset.influencer;
      if (!influencerMap[inf.id]) {
        influencerMap[inf.id] = {
          id: inf.id,
          name: inf.name,
          handle: inf.instagramHandle,
          viralCount: 0,
          totalMultiplier: 0,
        };
      }
      influencerMap[inf.id].viralCount++;
      influencerMap[inf.id].totalMultiplier += asset.viralMultiplier
        ? Number(asset.viralMultiplier)
        : 0;
    }

    const topInfluencers = Object.values(influencerMap)
      .sort((a, b) => b.viralCount - a.viralCount)
      .slice(0, 5)
      .map((inf) => ({
        ...inf,
        avgMultiplier:
          Math.round((inf.totalMultiplier / inf.viralCount) * 100) / 100,
      }));

    // Top 5 campaigns by viral content count
    const campaignMap: Record<
      string,
      { id: string; name: string; viralCount: number }
    > = {};
    for (const asset of viralAssets) {
      const campaign = asset.collaboration?.campaign;
      if (!campaign) continue;
      if (!campaignMap[campaign.id]) {
        campaignMap[campaign.id] = {
          id: campaign.id,
          name: campaign.name,
          viralCount: 0,
        };
      }
      campaignMap[campaign.id].viralCount++;
    }

    const topCampaigns = Object.values(campaignMap)
      .sort((a, b) => b.viralCount - a.viralCount)
      .slice(0, 5);

    return NextResponse.json({
      viralAssets: viralAssets.map((a) => ({
        id: a.id,
        influencer: a.influencer,
        platform: a.platform,
        contentType: a.contentType,
        views: a.views,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        saves: a.saves,
        viralMultiplier: a.viralMultiplier
          ? Number(a.viralMultiplier)
          : null,
        viralDetectedAt: a.viralDetectedAt,
        contentUrl: a.contentUrl,
        campaignName: a.collaboration?.campaign?.name || null,
        earnedMediaValue: calculateEarnedMediaValue(a),
      })),
      summary: {
        totalViral,
        avgMultiplier,
        topPlatform,
        totalEarnedMediaValue: Math.round(totalEarnedMediaValue),
      },
      monthlyTrend,
      topInfluencers,
      topCampaigns,
    });
  } catch (error) {
    console.error("Dashboard data fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
