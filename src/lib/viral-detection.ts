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

// ============================================================
// Virality Score — spectrum (0-100) replacement for the binary isViral flag
// ============================================================

export type ViralityTier = "viral" | "trending" | "normal";

export interface ViralityResult {
  score: number; // 0-100
  tier: ViralityTier;
  triggers: string[]; // metrics whose multiplier >= the viral threshold
  signals: string[]; // short human-readable reasons
  multipliers: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  };
  reachPct: number | null; // views / followers, when followers known
  commentToLikeRatio: number | null;
  engagementRate: number | null; // (likes+comments+shares+saves) / views, 0-100
}

// Score weights — sum to 1. Rebalanced toward comments + shares because
// those are the real algorithmic signals IG uses to push reels beyond the
// creator's own audience. Views scale linearly with virality but aren't the
// cause of it. Previous version weighted views at 30% which made the score
// effectively a popularity contest.
const SCORE_WEIGHTS = {
  views: 0.20,
  likes: 0.12,
  comments: 0.22, // discussion = real engagement
  shares: 0.18, // strongest algorithmic boost signal
  saves: 0.05, // usually null (private metric)
  reach: 0.13, // views / followers — audience break-out
  engagement: 0.10, // engagement rate quality
};

// Saturation: a 5x multiplier maxes out a metric's score contribution.
// Stops a single freak metric from dominating the composite.
const MULTIPLIER_SATURATION = 5;

function normalizeMultiplier(actual: number | null, avg: number): number | null {
  if (avg <= 0) return null;
  if (actual === null || actual <= 0) return null;
  return actual / avg;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function calculateVirality(
  asset: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  },
  baseline: BaselineMetrics,
  influencer?: { igFollowerCount?: number | null } | null,
): ViralityResult {
  const m = {
    views: normalizeMultiplier(asset.views, baseline.avgViews),
    likes: normalizeMultiplier(asset.likes, baseline.avgLikes),
    comments: normalizeMultiplier(asset.comments, baseline.avgComments),
    shares: normalizeMultiplier(asset.shares, baseline.avgShares),
    saves: normalizeMultiplier(asset.saves, baseline.avgSaves),
  };

  // Convert each multiplier to a 0-1 contribution. Null contributes 0
  // (missing data ≠ bad data). Reweight if baseline.sampleSize is small.
  const baseScore =
    SCORE_WEIGHTS.views * clamp01((m.views ?? 0) / MULTIPLIER_SATURATION) +
    SCORE_WEIGHTS.likes * clamp01((m.likes ?? 0) / MULTIPLIER_SATURATION) +
    SCORE_WEIGHTS.comments *
      clamp01((m.comments ?? 0) / MULTIPLIER_SATURATION) +
    SCORE_WEIGHTS.shares * clamp01((m.shares ?? 0) / MULTIPLIER_SATURATION) +
    SCORE_WEIGHTS.saves * clamp01((m.saves ?? 0) / MULTIPLIER_SATURATION);

  // Reach %: views vs follower count. 20%+ means content broke out of the
  // creator's own audience — strong viral signal.
  const followers = influencer?.igFollowerCount ?? 0;
  const reachPct =
    followers > 0 && asset.views && asset.views > 0
      ? (asset.views / followers) * 100
      : null;
  // Reach contribution: 50% of followers = full credit; saturates at 100%.
  const reachContribution =
    reachPct !== null ? clamp01(reachPct / 50) * SCORE_WEIGHTS.reach : 0;

  // Engagement rate (likes + comments + shares + saves) / views.
  const totalEng =
    (asset.likes ?? 0) +
    (asset.comments ?? 0) +
    (asset.shares ?? 0) +
    (asset.saves ?? 0);
  const engagementRate =
    asset.views && asset.views > 0 ? (totalEng / asset.views) * 100 : null;
  // 10% ER = max contribution. Typical IG ER is 1-3%.
  const engagementContribution =
    engagementRate !== null
      ? clamp01(engagementRate / 10) * SCORE_WEIGHTS.engagement
      : 0;

  const rawScore =
    (baseScore + reachContribution + engagementContribution) * 100;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Triggers: same rule as legacy checkIfViral so the leaderboard stays
  // consistent with the existing isViral flag.
  const triggers: string[] = [];
  if ((m.views ?? 0) >= VIRAL_THRESHOLDS.views) triggers.push("views");
  if ((m.likes ?? 0) >= VIRAL_THRESHOLDS.likes) triggers.push("likes");
  if ((m.comments ?? 0) >= VIRAL_THRESHOLDS.comments) triggers.push("comments");
  if ((m.shares ?? 0) >= VIRAL_THRESHOLDS.shares) triggers.push("shares");
  if ((m.saves ?? 0) >= VIRAL_THRESHOLDS.saves) triggers.push("saves");

  // Tier: score-based first, with triggers as a hard override (any metric
  // crossing the legacy threshold ⇒ at least "viral" regardless of score).
  let tier: ViralityTier;
  if (triggers.length > 0 || score >= 70) tier = "viral";
  else if (score >= 40) tier = "trending";
  else tier = "normal";

  // Comment-to-like ratio: high values indicate discussion/controversy,
  // which often drives outsized algorithmic reach on reels.
  const commentToLikeRatio =
    asset.likes && asset.likes > 0 && asset.comments
      ? asset.comments / asset.likes
      : null;

  // Build human-readable signals. Order = importance.
  const signals: string[] = [];
  if (m.views !== null && m.views >= 1.5) {
    signals.push(`Views ${m.views.toFixed(1)}× baseline`);
  }
  if (m.comments !== null && m.comments >= 1.5) {
    signals.push(`Comments ${m.comments.toFixed(1)}× baseline`);
  }
  if (m.shares !== null && m.shares >= 1.5) {
    signals.push(`Shares ${m.shares.toFixed(1)}× baseline`);
  }
  if (m.likes !== null && m.likes >= 1.5) {
    signals.push(`Likes ${m.likes.toFixed(1)}× baseline`);
  }
  if (reachPct !== null && reachPct >= 20) {
    signals.push(`Reached ${reachPct.toFixed(0)}% of followers`);
  }
  if (engagementRate !== null && engagementRate >= 6) {
    signals.push(`High engagement (${engagementRate.toFixed(1)}%)`);
  }
  if (commentToLikeRatio !== null && commentToLikeRatio >= 0.05) {
    signals.push(`High discussion (${(commentToLikeRatio * 100).toFixed(1)}% comment/like)`);
  }
  if (baseline.sampleSize === 0) {
    signals.push("No baseline yet — score uses absolute thresholds only");
  } else if (baseline.sampleSize < 5) {
    signals.push(`Baseline thin (${baseline.sampleSize} prior posts)`);
  }

  return {
    score,
    tier,
    triggers,
    signals,
    multipliers: m,
    reachPct,
    commentToLikeRatio,
    engagementRate,
  };
}
