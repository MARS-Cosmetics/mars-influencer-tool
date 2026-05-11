export const revalidate = 60;

import { prisma } from "@/lib/db";
import {
  calculateEarnedMediaValue,
  calculateBaseline,
  calculateVirality,
  type ViralityResult,
} from "@/lib/viral-detection";
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
import {
  Flame,
  TrendingUp,
  Award,
  DollarSign,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";

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

function scoreColor(score: number) {
  if (score >= 80) return "text-red-600 font-bold";
  if (score >= 70) return "text-orange-600 font-bold";
  if (score >= 50) return "text-amber-600 font-semibold";
  return "text-gray-600 font-medium";
}

function tierBadgeClass(tier: ViralityResult["tier"]) {
  if (tier === "viral") return "bg-orange-100 text-orange-800";
  if (tier === "trending") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function tierLabel(tier: ViralityResult["tier"]) {
  if (tier === "viral") return "🔥 Viral";
  if (tier === "trending") return "📈 Trending";
  return "Normal";
}

// CPV: per-asset slice of the collab's payable amount divided by views.
// Mirrors the asset detail page calculation.
function computeCpv(
  asset: {
    views: number | null;
    collaboration: {
      type: string;
      agreedAmount: unknown;
      payableAmount: unknown;
      _count: { assets: number };
    } | null;
  },
): { value: number | null; isBarter: boolean } {
  const collab = asset.collaboration;
  if (!collab) return { value: null, isBarter: false };
  if (collab.type === "barter") return { value: null, isBarter: true };
  if (!asset.views || asset.views <= 0) return { value: null, isBarter: false };
  const total = Number(collab.payableAmount ?? collab.agreedAmount ?? 0);
  const count = collab._count?.assets || 1;
  if (total <= 0) return { value: null, isBarter: false };
  const cpv = total / count / asset.views;
  return { value: cpv, isBarter: false };
}

export default async function ViralContentPage() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Pull every asset with measurable activity in the last 90 days, not just
  // pre-flagged isViral. We score them all live and partition into tiers.
  const candidates = await prisma.asset.findMany({
    where: {
      OR: [
        { isViral: true, viralDetectedAt: { gte: ninetyDaysAgo } },
        {
          views: { gt: 0 },
          publishedAt: { gte: ninetyDaysAgo },
        },
      ],
    },
    include: {
      influencer: {
        select: {
          id: true,
          name: true,
          instagramHandle: true,
          igFollowerCount: true,
        },
      },
      collaboration: {
        select: {
          id: true,
          type: true,
          agreedAmount: true,
          payableAmount: true,
          _count: { select: { assets: true } },
          campaign: { select: { id: true, name: true } },
        },
      },
    },
    take: 500,
  });

  // Compute baseline once per influencer (each call is one DB roundtrip).
  const uniqueInfluencerIds = Array.from(
    new Set(candidates.map((a) => a.influencer.id)),
  );
  const baselines = new Map<
    string,
    Awaited<ReturnType<typeof calculateBaseline>>
  >();
  await Promise.all(
    uniqueInfluencerIds.map(async (id) => {
      baselines.set(id, await calculateBaseline(id));
    }),
  );

  // Score every candidate.
  const scored = candidates.map((a) => {
    const baseline = baselines.get(a.influencer.id)!;
    const virality = calculateVirality(a, baseline, a.influencer);
    const cpv = computeCpv(a);
    const emv = calculateEarnedMediaValue(a);
    return { asset: a, virality, cpv, emv };
  });

  // Sort by score desc, then by views desc as tiebreaker.
  scored.sort((a, b) => {
    if (b.virality.score !== a.virality.score) {
      return b.virality.score - a.virality.score;
    }
    return (b.asset.views ?? 0) - (a.asset.views ?? 0);
  });

  const viralRows = scored.filter((s) => s.virality.tier === "viral").slice(0, 100);
  const trendingRows = scored
    .filter((s) => s.virality.tier === "trending")
    .slice(0, 30);

  // Summary aggregates use the viral set only — consistent with the prior
  // page's KPIs.
  const totalViral = viralRows.length;
  const avgScore =
    totalViral > 0
      ? Math.round(
          viralRows.reduce((sum, r) => sum + r.virality.score, 0) / totalViral,
        )
      : 0;

  const platformCounts: Record<string, number> = {};
  for (const row of viralRows) {
    platformCounts[row.asset.platform] =
      (platformCounts[row.asset.platform] || 0) + 1;
  }
  const topPlatform =
    Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const totalEarnedMediaValue = viralRows.reduce((sum, r) => sum + r.emv, 0);

  // Top influencers — derived from viral rows only.
  const influencerMap: Record<
    string,
    {
      id: string;
      name: string;
      handle: string | null;
      viralCount: number;
      totalScore: number;
    }
  > = {};
  for (const row of viralRows) {
    const inf = row.asset.influencer;
    if (!influencerMap[inf.id]) {
      influencerMap[inf.id] = {
        id: inf.id,
        name: inf.name,
        handle: inf.instagramHandle,
        viralCount: 0,
        totalScore: 0,
      };
    }
    influencerMap[inf.id].viralCount++;
    influencerMap[inf.id].totalScore += row.virality.score;
  }
  const topInfluencers = Object.values(influencerMap)
    .sort((a, b) => b.viralCount - a.viralCount)
    .slice(0, 5)
    .map((inf) => ({
      ...inf,
      avgScore: Math.round(inf.totalScore / inf.viralCount),
    }));

  function renderRow(row: (typeof scored)[number]) {
    const a = row.asset;
    const v = row.virality;
    const cpvStr = row.cpv.isBarter
      ? "Barter"
      : row.cpv.value !== null
        ? `₹${row.cpv.value < 1 ? row.cpv.value.toFixed(3) : row.cpv.value.toFixed(2)}`
        : "-";
    return (
      <TableRow key={a.id}>
        <TableCell>
          <div className="font-medium">{a.influencer.name}</div>
          {a.influencer.instagramHandle && (
            <div className="text-xs text-muted-foreground">
              @{a.influencer.instagramHandle}
            </div>
          )}
        </TableCell>
        <TableCell>
          <Badge className={platformBadgeClass(a.platform)}>
            {a.platform.replace(/_/g, " ")}
          </Badge>
        </TableCell>
        <TableCell>
          <div className={`text-base ${scoreColor(v.score)}`}>{v.score}</div>
          <Badge className={`${tierBadgeClass(v.tier)} mt-0.5 text-[10px]`}>
            {tierLabel(v.tier)}
          </Badge>
        </TableCell>
        <TableCell className="text-right">{formatCompact(a.views)}</TableCell>
        <TableCell className="text-right">{formatCompact(a.likes)}</TableCell>
        <TableCell className="text-right">
          {formatCompact(a.comments)}
        </TableCell>
        <TableCell className="text-right">{formatCompact(a.shares)}</TableCell>
        <TableCell className="text-right">
          {v.engagementRate !== null ? `${v.engagementRate.toFixed(1)}%` : "-"}
        </TableCell>
        <TableCell className="text-right">{cpvStr}</TableCell>
        <TableCell className="max-w-[260px]">
          <div className="flex flex-wrap gap-1">
            {v.signals.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              v.signals.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </TableCell>
        <TableCell>
          {a.collaboration?.campaign?.name || (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {a.contentUrl ? (
            (() => {
              // Show a short, clickable identifier (last path segment of the IG URL).
              // Falls back to "Open" if the URL doesn't parse.
              let label = "Open";
              try {
                const parts = new URL(a.contentUrl).pathname
                  .split("/")
                  .filter(Boolean);
                const slug = parts[parts.length - 1];
                if (slug) label = `/${parts[parts.length - 2] ?? ""}/${slug}`;
              } catch {
                /* keep default label */
              }
              return (
                <a
                  href={a.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  title={a.contentUrl}
                >
                  {label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })()
          ) : (
            <span className="text-xs text-muted-foreground">No URL</span>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Viral Content Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Score 0-100 from views, engagement, audience break-out, and discussion.
          Viral ≥ 70 or any metric ≥ 3× baseline. Trending = 40-69.
        </p>
      </div>

      {/* How scoring works — keeps the page self-explanatory for new users */}
      <details className="rounded-lg border bg-blue-50/40 p-4 text-sm">
        <summary className="cursor-pointer font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          How is this scored?
        </summary>
        <div className="mt-3 space-y-3 text-gray-700">
          <p>
            <span className="font-semibold">Two paths to Viral:</span>
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <span className="font-medium">Hard rule</span> — any metric crosses
              its threshold vs the influencer&apos;s last-20-asset average:{" "}
              <span className="font-mono text-xs">
                views/likes/comments ≥ 3×, shares/saves ≥ 5×
              </span>
              .
            </li>
            <li>
              <span className="font-medium">Composite score ≥ 70</span> — weighted
              blend of 7 signals, rebalanced toward comments + shares (the
              real algorithmic viral drivers, not raw view count):
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                <li>
                  <span className="font-medium">Comments</span> multiplier — 22%{" "}
                  <span className="text-gray-500">(real discussion)</span>
                </li>
                <li>
                  <span className="font-medium">Shares</span> multiplier — 18%{" "}
                  <span className="text-gray-500">
                    (strongest IG algorithm signal)
                  </span>
                </li>
                <li>Views multiplier — 20%</li>
                <li>Likes — 12% · Saves — 5%</li>
                <li>
                  Reach % (views ÷ follower count) — 13%{" "}
                  <span className="text-gray-500">
                    (audience break-out)
                  </span>
                </li>
                <li>Engagement Rate (likes+comments+shares+saves ÷ views) — 10%</li>
              </ul>
            </li>
          </ol>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Tiers:</span> 🔥 Viral = score ≥ 70 OR
            hard rule fires · 📈 Trending = 40-69 · Normal = below 40 (not shown).
          </p>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">&quot;Views&quot; = plays</span>{" "}
            (replays included) — matches what Instagram shows publicly. Bright
            Data also returns a smaller unique-viewer figure, stored on the asset
            for analytics but not displayed.
          </p>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Caveats:</span> Saves / Reach /
            Impressions are private to the account owner — Bright Data can&apos;t
            scrape them, so they&apos;re usually null and quietly drop from the
            score. Score is therefore weighted toward what we can measure. With
            single-snapshot data this is detection, not prediction — velocity-based
            forecasting requires time-series snapshots which aren&apos;t built yet.
          </p>
        </div>
      </details>

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
              Avg Virality Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}</div>
            <p className="text-xs text-muted-foreground">
              Across viral pieces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Platform</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {topPlatform.replace(/_/g, " ")}
            </div>
            <p className="text-xs text-muted-foreground">Most viral content</p>
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
              {"₹"}
              {formatIndian(Math.round(totalEarnedMediaValue))}
            </div>
            <p className="text-xs text-muted-foreground">Viral content only</p>
          </CardContent>
        </Card>
      </div>

      {/* Viral Content Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Viral Leaderboard
        </h2>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Eng. Rate</TableHead>
                <TableHead className="text-right">CPV</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viralRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                    No viral content in the last 90 days. Refresh asset metrics from
                    Bright Data to populate.
                  </TableCell>
                </TableRow>
              ) : (
                viralRows.map(renderRow)
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Trending (Near-Viral) */}
      {trendingRows.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Trending — Approaching Viral (score 40-69)
          </h2>
          <div className="rounded-lg border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Eng. Rate</TableHead>
                  <TableHead className="text-right">CPV</TableHead>
                  <TableHead>Signals</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{trendingRows.map(renderRow)}</TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Top Influencers */}
      {topInfluencers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Top Viral Influencers</h2>
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
                      {inf.avgScore} avg score
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
