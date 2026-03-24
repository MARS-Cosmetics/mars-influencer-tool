import { prisma } from "@/lib/db";

// Viral thresholds (relative to influencer baseline)
const VIRAL_THRESHOLDS = {
  views: 3, // 3x avg views
  likes: 3, // 3x avg likes
  comments: 3, // 3x avg comments
  shares: 5, // 5x avg shares
  saves: 5, // 5x avg saves
};

export interface BaselineMetrics {
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  sampleSize: number;
}

export interface ViralCheckResult {
  isViral: boolean;
  viralMultiplier: number;
  triggeredBy: string[];
}

/**
 * Calculate baseline metrics for an influencer based on their last 20 assets.
 */
export async function calculateBaseline(
  influencerId: string
): Promise<BaselineMetrics> {
  const assets = await prisma.asset.findMany({
    where: { influencerId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
    },
  });

  if (assets.length === 0) {
    return {
      avgViews: 0,
      avgLikes: 0,
      avgComments: 0,
      avgShares: 0,
      avgSaves: 0,
      sampleSize: 0,
    };
  }

  const sum = (arr: (number | null)[]): number =>
    arr.reduce<number>((acc, v) => acc + (v ?? 0), 0);

  const count = assets.length;

  return {
    avgViews: Math.round(sum(assets.map((a) => a.views)) / count),
    avgLikes: Math.round(sum(assets.map((a) => a.likes)) / count),
    avgComments: Math.round(sum(assets.map((a) => a.comments)) / count),
    avgShares: Math.round(sum(assets.map((a) => a.shares)) / count),
    avgSaves: Math.round(sum(assets.map((a) => a.saves)) / count),
    sampleSize: count,
  };
}

/**
 * Check if an asset is viral by comparing its metrics against the influencer's baseline.
 */
export function checkIfViral(
  asset: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  },
  baseline: BaselineMetrics
): ViralCheckResult {
  if (baseline.sampleSize === 0) {
    return { isViral: false, viralMultiplier: 0, triggeredBy: [] };
  }

  const triggeredBy: string[] = [];
  const multipliers: number[] = [];

  const check = (
    metricName: string,
    value: number | null,
    avg: number,
    threshold: number
  ) => {
    if (avg > 0 && (value ?? 0) > 0) {
      const multiplier = (value ?? 0) / avg;
      if (multiplier >= threshold) {
        triggeredBy.push(metricName);
        multipliers.push(multiplier);
      }
    }
  };

  check("views", asset.views, baseline.avgViews, VIRAL_THRESHOLDS.views);
  check("likes", asset.likes, baseline.avgLikes, VIRAL_THRESHOLDS.likes);
  check(
    "comments",
    asset.comments,
    baseline.avgComments,
    VIRAL_THRESHOLDS.comments
  );
  check("shares", asset.shares, baseline.avgShares, VIRAL_THRESHOLDS.shares);
  check("saves", asset.saves, baseline.avgSaves, VIRAL_THRESHOLDS.saves);

  const isViral = triggeredBy.length > 0;
  const viralMultiplier =
    multipliers.length > 0
      ? Math.round(
          (multipliers.reduce((a, b) => a + b, 0) / multipliers.length) * 100
        ) / 100
      : 0;

  return { isViral, viralMultiplier, triggeredBy };
}

/**
 * Calculate estimated earned media value (in INR).
 */
export function calculateEarnedMediaValue(asset: {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}): number {
  return (
    (asset.views ?? 0) * 0.05 +
    (asset.likes ?? 0) * 0.5 +
    (asset.comments ?? 0) * 2 +
    (asset.shares ?? 0) * 3 +
    (asset.saves ?? 0) * 1.5
  );
}
