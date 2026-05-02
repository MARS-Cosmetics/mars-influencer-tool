import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await props.params;
    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") || "weekly";
    const dateParam = searchParams.get("date");
    const referenceDate = dateParam ? new Date(dateParam) : new Date();
    const { start, end } =
      period === "monthly"
        ? getMonthBoundaries(referenceDate)
        : getWeekBoundaries(referenceDate);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // All collabs assigned to this user in approved/completed status
    const collabs = await prisma.collaboration.findMany({
      where: {
        assignedTo: userId,
        status: { in: ["content_approved", "completed"] },
      },
      include: {
        influencer: {
          select: { id: true, name: true, instagramHandle: true },
        },
        campaign: { select: { id: true, name: true } },
        assets: { select: { views: true } },
        statusTransitions: {
          where: { toStatus: "content_approved" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filter to ones whose first content_approved is in the period
    const inPeriod = collabs.filter((c) => {
      const approvedAt =
        c.statusTransitions.length > 0
          ? c.statusTransitions[0].createdAt
          : c.updatedAt;
      return approvedAt >= start && approvedAt < end;
    });

    let totalViews = 0;
    let totalSpent = 0;
    let cpvSum = 0;
    let paidCount = 0;

    const breakdown = inPeriod.map((c) => {
      const views = c.assets.reduce((s, a) => s + (a.views || 0), 0);
      const isPaid = c.type === "paid";
      const amount = c.agreedAmount ? Number(c.agreedAmount) : 0;
      const cpv = isPaid && views > 0 && amount > 0 ? amount / views : 0;

      totalViews += views;
      if (isPaid && amount > 0) {
        totalSpent += amount;
        if (views > 0) {
          cpvSum += cpv;
          paidCount += 1;
        }
      }

      const approvedAt =
        c.statusTransitions.length > 0
          ? c.statusTransitions[0].createdAt
          : c.updatedAt;

      return {
        collabId: c.id,
        influencer: {
          id: c.influencer.id,
          name: c.influencer.name,
          handle: c.influencer.instagramHandle,
        },
        campaign: c.campaign?.name ?? null,
        type: c.type,
        status: c.status,
        agreedAmount: amount,
        views,
        cpv: Math.round(cpv * 100) / 100,
        approvedAt: approvedAt.toISOString(),
      };
    });

    const avgCPV = paidCount > 0 ? cpvSum / paidCount : 0;
    const allBarter = paidCount === 0 && breakdown.length > 0;

    return NextResponse.json({
      user,
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        collabCount: breakdown.length,
        totalViews,
        totalSpent: Math.round(totalSpent * 100) / 100,
        avgCPV: Math.round(avgCPV * 100) / 100,
        allBarter,
      },
      collabs: breakdown,
    });
  } catch (error) {
    console.error("Leaderboard user detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user breakdown" },
      { status: 500 }
    );
  }
}
