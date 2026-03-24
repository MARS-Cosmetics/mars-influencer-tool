export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateEarnedMediaValue } from "@/lib/viral-detection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Award, DollarSign, ExternalLink } from "lucide-react";

function formatIndian(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function platformBadgeClass(platform: string) {
  const map: Record<string, string> = {
    instagram: "bg-pink-100 text-pink-800",
    instagram_reel: "bg-pink-100 text-pink-800",
    youtube: "bg-red-100 text-red-800",
    youtube_short: "bg-red-100 text-red-800",
    twitter: "bg-sky-100 text-sky-800",
    linkedin: "bg-blue-100 text-blue-800",
    blog: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  };
  return map[platform] || "bg-gray-100 text-gray-800";
}

function multiplierColor(multiplier: number): string {
  if (multiplier > 10) return "text-red-600 font-bold";
  if (multiplier > 5) return "text-orange-600 font-semibold";
  return "text-yellow-600 font-medium";
}

export default async function ViralContentPage() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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

  // Summary
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

  const platformCounts: Record<string, number> = {};
  for (const asset of viralAssets) {
    platformCounts[asset.platform] =
      (platformCounts[asset.platform] || 0) + 1;
  }
  const topPlatform =
    Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "N/A";

  const totalEarnedMediaValue = viralAssets.reduce(
    (sum, asset) => sum + calculateEarnedMediaValue(asset),
    0
  );

  // Top influencers
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

  // Monthly trend (last 6 months)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Viral Content Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track content that outperforms influencer baselines across campaigns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Viral Pieces
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViral}</div>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Viral Multiplier
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMultiplier}x</div>
            <p className="text-xs text-muted-foreground">
              Above influencer baseline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Best Platform
            </CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {topPlatform.replace(/_/g, " ")}
            </div>
            <p className="text-xs text-muted-foreground">
              Most viral content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Est. Earned Media Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {"\u20B9"}{formatIndian(Math.round(totalEarnedMediaValue))}
            </div>
            <p className="text-xs text-muted-foreground">
              Viral content only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Viral Content Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Influencer</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Content Type</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Viral Multiplier</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Eng. Rate</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viralAssets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-gray-500 py-8"
                >
                  No viral content detected yet. Run a scan to check recent
                  assets.
                </TableCell>
              </TableRow>
            ) : (
              viralAssets.map((asset) => {
                const multiplier = asset.viralMultiplier
                  ? Number(asset.viralMultiplier)
                  : 0;
                const totalEngagements =
                  (asset.likes ?? 0) +
                  (asset.comments ?? 0) +
                  (asset.shares ?? 0) +
                  (asset.saves ?? 0);
                const engRate =
                  asset.views && asset.views > 0
                    ? ((totalEngagements / asset.views) * 100).toFixed(1)
                    : "-";

                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="font-medium">{asset.influencer.name}</div>
                      {asset.influencer.instagramHandle && (
                        <div className="text-xs text-muted-foreground">
                          @{asset.influencer.instagramHandle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={platformBadgeClass(asset.platform)}>
                        {asset.platform.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {asset.contentType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCompact(asset.views)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={multiplierColor(multiplier)}>
                        {multiplier}x {"\uD83D\uDD25"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCompact(asset.likes)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCompact(asset.shares)}
                    </TableCell>
                    <TableCell className="text-right">
                      {engRate !== "-" ? `${engRate}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {asset.collaboration?.campaign?.name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.viralDetectedAt
                        ? new Date(asset.viralDetectedAt).toLocaleDateString(
                            "en-IN"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {asset.contentUrl ? (
                        <a
                          href={asset.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Top Influencers */}
      {topInfluencers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Top Viral Influencers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topInfluencers.map((inf) => (
              <Card key={inf.id}>
                <CardContent className="pt-6">
                  <div className="font-semibold">{inf.name}</div>
                  {inf.handle && (
                    <div className="text-xs text-muted-foreground">
                      @{inf.handle}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-orange-600 font-medium">
                      {inf.viralCount} viral
                    </span>
                    <span className="text-muted-foreground">
                      {inf.avgMultiplier}x avg
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Monthly Trend</h2>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Viral Count</TableHead>
                  <TableHead className="text-right">
                    Avg Multiplier
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTrend.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">
                      {row.viralCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.avgMultiplier}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
