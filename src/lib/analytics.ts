import { prisma } from "@/lib/db";
import { buildAssetScopeWhere } from "@/lib/asset-scope";

export type AssetRow = {
  id: string;
  influencerId: string;
  collabId: string;
  platform: string;
  contentType: string;
  publishedAt: Date | null;
  views: number;
  likes: number;
  comments: number;
  spend: number;
  cpv: number | null;
  isViral: boolean;
  collabType: string;
  contentUrl: string | null;
};

export type InfluencerRow = {
  influencerId: string;
  name: string;
  handle: string | null;
  tier: string | null;
  assetCount: number;
  views: number;
  likes: number;
  comments: number;
  spend: number;
  cpv: number | null;
  viralCount: number;
  engagementRate: number | null;
};

export type Totals = {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalSpend: number;
  avgCpv: number | null;
  engagementRate: number | null;
  viralCount: number;
  assetCount: number;
  influencerCount: number;
};

export type SeriesPoint = {
  date: string;
  views: number;
  spend: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
};

export type TierPoint = {
  tier: string;
  views: number;
  spend: number;
  cpv: number | null;
  assetCount: number;
  influencerCount: number;
};

export type CategoryPoint = {
  key: string;
  label: string;
  views: number;
  spend: number;
  cpv: number | null;
  assetCount: number;
};

export type TopRow = {
  influencerId: string;
  name: string;
  handle: string | null;
  tier: string | null;
  value: number;
  secondary?: number | null;
};

export type AnalyticsBreakdown = {
  totals: Totals;
  previousTotals: Totals | null;
  perInfluencer: InfluencerRow[];
  assetsByInfluencer: Record<string, AssetRow[]>;
  timeSeries: SeriesPoint[];
  byTier: TierPoint[];
  byPlatform: CategoryPoint[];
  byContentType: CategoryPoint[];
  byCollabType: CategoryPoint[];
  topByViews: TopRow[];
  topByEngagement: TopRow[];
  topByCpv: TopRow[];
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function engagementRate(views: number, likes: number, comments: number): number | null {
  if (views <= 0) return null;
  return ((likes + comments) / views) * 100;
}

const TIER_ORDER = ["nano", "micro", "mid", "macro", "mega", "unknown"];

function humanLabel(key: string): string {
  if (!key) return "Other";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type AnalyticsScope = {
  userId: string | null;
  role: string | null | undefined;
};

export async function getAnalyticsBreakdown(
  from: Date,
  to: Date,
  scope: AnalyticsScope,
): Promise<AnalyticsBreakdown> {
  const current = await aggregateWindow(from, to, scope);

  const windowMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - windowMs);
  const previous = await aggregateWindow(prevFrom, prevTo, scope, {
    totalsOnly: true,
  });

  return {
    ...current,
    previousTotals: previous.totals,
  };
}

type AggregateResult = Omit<AnalyticsBreakdown, "previousTotals">;

async function aggregateWindow(
  from: Date,
  to: Date,
  scope: AnalyticsScope,
  opts: { totalsOnly?: boolean } = {},
): Promise<AggregateResult> {
  const scopeWhere = buildAssetScopeWhere(scope.userId, scope.role);
  const assets = await prisma.asset.findMany({
    where: {
      ...scopeWhere,
      publishedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      views: true,
      likes: true,
      comments: true,
      isViral: true,
      platform: true,
      contentType: true,
      publishedAt: true,
      contentUrl: true,
      collaboration: {
        select: {
          id: true,
          type: true,
          payableAmount: true,
          agreedAmount: true,
          _count: { select: { assets: true } },
          influencer: {
            select: {
              id: true,
              name: true,
              instagramHandle: true,
              tier: true,
            },
          },
        },
      },
    },
  });

  const assetRows: AssetRow[] = [];
  const influencerMap = new Map<string, InfluencerRow>();
  const assetsByInfluencer: Record<string, AssetRow[]> = {};
  const dayMap = new Map<string, SeriesPoint>();
  const tierMap = new Map<string, TierPoint>();
  const tierInfluencers = new Map<string, Set<string>>();
  const platformMap = new Map<string, CategoryPoint>();
  const contentTypeMap = new Map<string, CategoryPoint>();
  const collabTypeMap = new Map<string, CategoryPoint>();

  for (const a of assets) {
    const collab = a.collaboration;
    if (!collab || !collab.influencer) continue;
    const inf = collab.influencer;
    const denom = collab._count?.assets || 1;
    const collabTotal = Number(collab.payableAmount ?? collab.agreedAmount ?? 0);
    const perAssetSpend =
      collab.type === "barter" || collabTotal <= 0 ? 0 : collabTotal / denom;
    const views = a.views ?? 0;
    const likes = a.likes ?? 0;
    const comments = a.comments ?? 0;
    const cpv = perAssetSpend > 0 && views > 0 ? perAssetSpend / views : null;

    const row: AssetRow = {
      id: a.id,
      influencerId: inf.id,
      collabId: collab.id,
      platform: a.platform ?? "other",
      contentType: a.contentType ?? "other",
      publishedAt: a.publishedAt,
      views,
      likes,
      comments,
      spend: perAssetSpend,
      cpv,
      isViral: !!a.isViral,
      collabType: collab.type ?? "paid",
      contentUrl: a.contentUrl,
    };
    assetRows.push(row);

    if (!assetsByInfluencer[inf.id]) assetsByInfluencer[inf.id] = [];
    assetsByInfluencer[inf.id].push(row);

    const prev = influencerMap.get(inf.id);
    if (prev) {
      prev.views += views;
      prev.likes += likes;
      prev.comments += comments;
      prev.spend += perAssetSpend;
      prev.assetCount += 1;
      if (a.isViral) prev.viralCount += 1;
    } else {
      influencerMap.set(inf.id, {
        influencerId: inf.id,
        name: inf.name,
        handle: inf.instagramHandle,
        tier: inf.tier,
        assetCount: 1,
        views,
        likes,
        comments,
        spend: perAssetSpend,
        cpv: null,
        viralCount: a.isViral ? 1 : 0,
        engagementRate: null,
      });
    }

    if (a.publishedAt) {
      const k = isoDay(a.publishedAt);
      const dp = dayMap.get(k);
      if (dp) {
        dp.views += views;
        dp.spend += perAssetSpend;
        dp.likes += likes;
        dp.comments += comments;
      } else {
        dayMap.set(k, {
          date: k,
          views,
          spend: perAssetSpend,
          likes,
          comments,
          engagementRate: null,
        });
      }
    }

    const tierKey = inf.tier || "unknown";
    const tp = tierMap.get(tierKey);
    if (tp) {
      tp.views += views;
      tp.spend += perAssetSpend;
      tp.assetCount += 1;
    } else {
      tierMap.set(tierKey, {
        tier: tierKey,
        views,
        spend: perAssetSpend,
        cpv: null,
        assetCount: 1,
        influencerCount: 0,
      });
    }
    if (!tierInfluencers.has(tierKey)) tierInfluencers.set(tierKey, new Set());
    tierInfluencers.get(tierKey)!.add(inf.id);

    bumpCategory(platformMap, row.platform, row);
    bumpCategory(contentTypeMap, row.contentType, row);
    bumpCategory(collabTypeMap, row.collabType, row);
  }

  for (const r of influencerMap.values()) {
    r.cpv = r.spend > 0 && r.views > 0 ? r.spend / r.views : null;
    r.engagementRate = engagementRate(r.views, r.likes, r.comments);
  }
  for (const [tier, set] of tierInfluencers) {
    const tp = tierMap.get(tier);
    if (tp) tp.influencerCount = set.size;
  }
  for (const tp of tierMap.values()) {
    tp.cpv = tp.spend > 0 && tp.views > 0 ? tp.spend / tp.views : null;
  }
  for (const dp of dayMap.values()) {
    dp.engagementRate = engagementRate(dp.views, dp.likes, dp.comments);
  }
  for (const m of [platformMap, contentTypeMap, collabTypeMap]) {
    for (const cp of m.values()) {
      cp.cpv = cp.spend > 0 && cp.views > 0 ? cp.spend / cp.views : null;
    }
  }

  const perInfluencer = Array.from(influencerMap.values()).sort(
    (a, b) => b.views - a.views,
  );

  const totalViews = perInfluencer.reduce((s, r) => s + r.views, 0);
  const totalLikes = perInfluencer.reduce((s, r) => s + r.likes, 0);
  const totalComments = perInfluencer.reduce((s, r) => s + r.comments, 0);
  const totalSpend = perInfluencer.reduce((s, r) => s + r.spend, 0);
  const viralCount = perInfluencer.reduce((s, r) => s + r.viralCount, 0);
  const paidViews = assetRows
    .filter((a) => a.spend > 0)
    .reduce((s, a) => s + a.views, 0);

  const totals: Totals = {
    totalViews,
    totalLikes,
    totalComments,
    totalSpend,
    avgCpv: paidViews > 0 ? totalSpend / paidViews : null,
    engagementRate: engagementRate(totalViews, totalLikes, totalComments),
    viralCount,
    assetCount: assetRows.length,
    influencerCount: perInfluencer.length,
  };

  if (opts.totalsOnly) {
    return {
      totals,
      perInfluencer: [],
      assetsByInfluencer: {},
      timeSeries: [],
      byTier: [],
      byPlatform: [],
      byContentType: [],
      byCollabType: [],
      topByViews: [],
      topByEngagement: [],
      topByCpv: [],
    };
  }

  const timeSeries = fillDailyGaps(Array.from(dayMap.values()), from, to);

  const byTier = Array.from(tierMap.values()).sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );

  const byPlatform = sortAndLabel(Array.from(platformMap.values()), "views");
  const byContentType = sortAndLabel(Array.from(contentTypeMap.values()), "views");
  const byCollabType = sortAndLabel(Array.from(collabTypeMap.values()), "views");

  const topByViews = perInfluencer
    .filter((r) => r.views > 0)
    .slice(0, 10)
    .map(
      (r): TopRow => ({
        influencerId: r.influencerId,
        name: r.name,
        handle: r.handle,
        tier: r.tier,
        value: r.views,
        secondary: r.assetCount,
      }),
    );

  // Engagement: only include influencers with at least 3 assets so a single
  // viral spike doesn't trump real consistent performers.
  const topByEngagement = perInfluencer
    .filter((r) => r.engagementRate !== null && r.assetCount >= 3)
    .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
    .slice(0, 10)
    .map(
      (r): TopRow => ({
        influencerId: r.influencerId,
        name: r.name,
        handle: r.handle,
        tier: r.tier,
        value: r.engagementRate ?? 0,
        secondary: r.views,
      }),
    );

  // CPV: lowest first (best ROI). Exclude barter (no spend) and require
  // meaningful spend so we don't crown a ₹100 collab as "best ROI".
  const topByCpv = perInfluencer
    .filter((r) => r.cpv !== null && r.spend >= 1000)
    .sort((a, b) => (a.cpv ?? Infinity) - (b.cpv ?? Infinity))
    .slice(0, 10)
    .map(
      (r): TopRow => ({
        influencerId: r.influencerId,
        name: r.name,
        handle: r.handle,
        tier: r.tier,
        value: r.cpv ?? 0,
        secondary: r.spend,
      }),
    );

  return {
    totals,
    perInfluencer,
    assetsByInfluencer,
    timeSeries,
    byTier,
    byPlatform,
    byContentType,
    byCollabType,
    topByViews,
    topByEngagement,
    topByCpv,
  };
}

function bumpCategory(
  map: Map<string, CategoryPoint>,
  key: string,
  a: AssetRow,
): void {
  const existing = map.get(key);
  if (existing) {
    existing.views += a.views;
    existing.spend += a.spend;
    existing.assetCount += 1;
  } else {
    map.set(key, {
      key,
      label: humanLabel(key),
      views: a.views,
      spend: a.spend,
      cpv: null,
      assetCount: 1,
    });
  }
}

function sortAndLabel(
  points: CategoryPoint[],
  by: "views" | "spend",
): CategoryPoint[] {
  return points.sort((a, b) => b[by] - a[by]);
}

function fillDailyGaps(
  points: SeriesPoint[],
  from: Date,
  to: Date,
): SeriesPoint[] {
  const map = new Map(points.map((p) => [p.date, p]));
  const out: SeriesPoint[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const k = isoDay(cur);
    out.push(
      map.get(k) ?? {
        date: k,
        views: 0,
        spend: 0,
        likes: 0,
        comments: 0,
        engagementRate: null,
      },
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
