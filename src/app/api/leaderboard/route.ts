import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// =====================================================================
// SCORING CONFIG — tune these to match what "good" looks like for the team
// =====================================================================
const TARGETS = {
  // Reach: total views in period that scores 10/10
  REACH_FOR_10: 5_000_000,
  // Efficiency (CPV): linear from BEST (0/10 score off, 10/10 reward) to WORST
  CPV_FOR_10: 0.05, // ₹0.05/view = perfect efficiency
  CPV_FOR_0: 0.2, // ₹0.20/view = no efficiency credit
  // Volume: collabs in period that score 10/10
  VOLUME_FOR_10: 4,
  // Weights (must sum to 1.0)
  WEIGHTS: {
    reach: 0.35,
    efficiency: 0.25,
    volume: 0.2,
    quality: 0.2,
  },
  // Default scores when data is missing
  EFFICIENCY_DEFAULT_FOR_BARTER: 5, // all-barter users → neutral, not 0
  QUALITY_DEFAULT_NO_RATINGS: 5, // no content ratings logged → neutral
};

function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

function getMonthBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  );
  return { start, end };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") || "weekly";
    const dateParam = searchParams.get("date");
    const referenceDate = dateParam ? new Date(dateParam) : new Date();
    const { start, end } =
      period === "monthly"
        ? getMonthBoundaries(referenceDate)
        : getWeekBoundaries(referenceDate);

    // Pull all collabs in qualifying status with their data
    const collaborations = await prisma.collaboration.findMany({
      where: { status: { in: ["content_approved", "completed"] } },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        influencer: {
          select: { id: true, name: true, instagramHandle: true },
        },
        assets: { select: { views: true, contentRating: true } },
        statusTransitions: {
          where: { toStatus: "content_approved" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    // Filter to those approved in this period
    const inPeriod = collaborations.filter((c) => {
      const approvedAt =
        c.statusTransitions.length > 0
          ? c.statusTransitions[0].createdAt
          : c.updatedAt;
      return approvedAt >= start && approvedAt < end;
    });

    // Group by user, aggregate per-collab data
    type UserAgg = {
      userId: string;
      userName: string;
      userEmail: string;
      totalViews: number;
      collabCount: number;
      paidCPVs: number[]; // for median CPV
      ratings: number[]; // content ratings across all assets
      topCollab: { handle: string; views: number } | null;
      totalSpent: number;
      hasPaid: boolean;
    };
    const userMap = new Map<string, UserAgg>();

    for (const collab of inPeriod) {
      const userId = collab.assignee.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: collab.assignee.name,
          userEmail: collab.assignee.email,
          totalViews: 0,
          collabCount: 0,
          paidCPVs: [],
          ratings: [],
          topCollab: null,
          totalSpent: 0,
          hasPaid: false,
        });
      }
      const e = userMap.get(userId)!;
      e.collabCount++;

      const collabViews = collab.assets.reduce(
        (s, a) => s + (a.views || 0),
        0
      );
      e.totalViews += collabViews;

      const handle =
        collab.influencer.instagramHandle || collab.influencer.name;
      if (!e.topCollab || collabViews > e.topCollab.views) {
        e.topCollab = { handle, views: collabViews };
      }

      // Per-collab CPV (paid only, with views)
      if (collab.type === "paid" && collab.agreedAmount) {
        e.hasPaid = true;
        e.totalSpent += Number(collab.agreedAmount);
        if (collabViews > 0) {
          e.paidCPVs.push(Number(collab.agreedAmount) / collabViews);
        }
      }

      // Collect ratings from assets
      for (const a of collab.assets) {
        if (a.contentRating != null) {
          e.ratings.push(Number(a.contentRating));
        }
      }
    }

    // Calculate component scores per user
    const leaderboard = Array.from(userMap.values())
      .map((e) => {
        // 1. REACH (0–10) — linear from 0 to TARGETS.REACH_FOR_10
        const reachScore = clamp(
          (e.totalViews / TARGETS.REACH_FOR_10) * 10,
          0,
          10
        );

        // 2. EFFICIENCY (0–10) — uses median CPV; barter-only → neutral
        const medianCPV = median(e.paidCPVs);
        let efficiencyScore: number;
        if (!e.hasPaid) {
          efficiencyScore = TARGETS.EFFICIENCY_DEFAULT_FOR_BARTER;
        } else if (medianCPV <= 0) {
          efficiencyScore = TARGETS.EFFICIENCY_DEFAULT_FOR_BARTER;
        } else {
          // Linear: CPV_FOR_10 → 10, CPV_FOR_0 → 0
          const span = TARGETS.CPV_FOR_0 - TARGETS.CPV_FOR_10;
          const fromBest = medianCPV - TARGETS.CPV_FOR_10;
          efficiencyScore = clamp(10 - (fromBest / span) * 10, 0, 10);
        }

        // 3. VOLUME (0–10) — linear, capped at TARGETS.VOLUME_FOR_10
        const volumeScore = clamp(
          (e.collabCount / TARGETS.VOLUME_FOR_10) * 10,
          0,
          10
        );

        // 4. QUALITY (0–10) — avg content rating × 2; if none, neutral
        const qualityScore =
          e.ratings.length > 0
            ? clamp(
                (e.ratings.reduce((s, r) => s + r, 0) / e.ratings.length) * 2,
                0,
                10
              )
            : TARGETS.QUALITY_DEFAULT_NO_RATINGS;

        // Final weighted score
        const score =
          TARGETS.WEIGHTS.reach * reachScore +
          TARGETS.WEIGHTS.efficiency * efficiencyScore +
          TARGETS.WEIGHTS.volume * volumeScore +
          TARGETS.WEIGHTS.quality * qualityScore;

        return {
          userId: e.userId,
          userName: e.userName,
          userEmail: e.userEmail,
          score: round1(score),
          components: {
            reach: round1(reachScore),
            efficiency: round1(efficiencyScore),
            volume: round1(volumeScore),
            quality: round1(qualityScore),
          },
          totalViews: e.totalViews,
          collabCount: e.collabCount,
          medianCPV: Math.round(medianCPV * 100) / 100,
          totalSpent: Math.round(e.totalSpent * 100) / 100,
          allBarter: !e.hasPaid,
          hasRatings: e.ratings.length > 0,
          topCollaboration: e.topCollab ? e.topCollab.handle : null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    // Summary
    const totalCollaborations = inPeriod.length;
    const totalViews = leaderboard.reduce((s, e) => s + e.totalViews, 0);
    const paidUsers = leaderboard.filter((e) => !e.allBarter);
    const avgCPV =
      paidUsers.length > 0
        ? paidUsers.reduce((s, e) => s + e.medianCPV, 0) / paidUsers.length
        : 0;
    const topPerformer = leaderboard.length > 0 ? leaderboard[0] : null;

    return NextResponse.json({
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      scoring: {
        formula:
          "weighted: 35% reach + 25% efficiency + 20% volume + 20% quality, each 0–10",
        targets: TARGETS,
      },
      summary: {
        totalCollaborations,
        totalViews,
        avgCPV: Math.round(avgCPV * 100) / 100,
        topPerformer: topPerformer
          ? { name: topPerformer.userName, score: topPerformer.score }
          : null,
      },
      leaderboard,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
}
