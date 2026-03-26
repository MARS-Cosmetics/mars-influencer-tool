import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);

  return { start: monday, end: nextMonday };
}

function getMonthBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
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

    // Find collaborations that were first approved (content_approved) during this period.
    // Strategy: use StatusTransition table to find the FIRST transition to content_approved.
    // If no StatusTransition exists for a collaboration, fall back to collaboration.updatedAt.

    // Step 1: Get all collaborations in qualifying statuses
    const collaborations = await prisma.collaboration.findMany({
      where: {
        status: { in: ["content_approved", "completed"] },
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        influencer: {
          select: { id: true, name: true, instagramHandle: true },
        },
        assets: {
          select: { views: true },
        },
        statusTransitions: {
          where: { toStatus: "content_approved" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    // Step 2: Filter collaborations whose first content_approved date falls within the period
    const qualifyingCollabs = collaborations.filter((collab) => {
      let approvedDate: Date;

      if (collab.statusTransitions.length > 0) {
        approvedDate = collab.statusTransitions[0].createdAt;
      } else {
        // Fallback: use collaboration updatedAt
        approvedDate = collab.updatedAt;
      }

      return approvedDate >= start && approvedDate < end;
    });

    // Step 3: Group by assignee and calculate scores
    const userMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string;
        totalViews: number;
        collabCount: number;
        cpvSum: number;
        paidCollabCount: number;
        allBarter: boolean;
        topCollab: { handle: string; views: number } | null;
      }
    >();

    for (const collab of qualifyingCollabs) {
      const userId = collab.assignee.id;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: collab.assignee.name,
          userEmail: collab.assignee.email,
          totalViews: 0,
          collabCount: 0,
          cpvSum: 0,
          paidCollabCount: 0,
          allBarter: true,
          topCollab: null,
        });
      }

      const entry = userMap.get(userId)!;
      entry.collabCount += 1;

      // Sum views from assets
      const collabViews = collab.assets.reduce(
        (sum, asset) => sum + (asset.views || 0),
        0
      );
      entry.totalViews += collabViews;

      // Track top collaboration by views
      const handle = collab.influencer.instagramHandle || collab.influencer.name;
      if (!entry.topCollab || collabViews > entry.topCollab.views) {
        entry.topCollab = { handle, views: collabViews };
      }

      // CPV calculation
      const isPaid = collab.type === "paid";
      if (isPaid && collab.agreedAmount) {
        entry.allBarter = false;
        if (collabViews > 0) {
          const cpv = Number(collab.agreedAmount) / collabViews;
          entry.cpvSum += cpv;
          entry.paidCollabCount += 1;
        }
      }
      // barter: CPV = 0, contributes 0 to cpvSum but counts toward collabCount
    }

    // Step 4: Calculate final scores and build leaderboard
    const leaderboard = Array.from(userMap.values())
      .map((entry) => {
        const avgCPV =
          entry.paidCollabCount > 0
            ? entry.cpvSum / entry.paidCollabCount
            : 0;

        // Score = (totalViews / avgCPV) * collabCount
        // If avgCPV is 0 (all barter), the views/CPV ratio contributes 0
        const viewsCpvRatio = avgCPV > 0 ? entry.totalViews / avgCPV : 0;
        const score = viewsCpvRatio * entry.collabCount;

        return {
          userId: entry.userId,
          userName: entry.userName,
          userEmail: entry.userEmail,
          score: Math.round(score * 100) / 100,
          totalViews: entry.totalViews,
          collabCount: entry.collabCount,
          avgCPV: Math.round(avgCPV * 100) / 100,
          allBarter: entry.allBarter,
          topCollaboration: entry.topCollab
            ? entry.topCollab.handle
            : null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    // Summary stats
    const totalCollaborations = qualifyingCollabs.length;
    const totalViews = leaderboard.reduce((s, e) => s + e.totalViews, 0);
    const totalAvgCPV =
      leaderboard.filter((e) => !e.allBarter).length > 0
        ? leaderboard
            .filter((e) => !e.allBarter)
            .reduce((s, e) => s + e.avgCPV, 0) /
          leaderboard.filter((e) => !e.allBarter).length
        : 0;
    const topPerformer = leaderboard.length > 0 ? leaderboard[0] : null;

    return NextResponse.json({
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary: {
        totalCollaborations,
        totalViews,
        avgCPV: Math.round(totalAvgCPV * 100) / 100,
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
