export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Handshake,
  Megaphone,
  CreditCard,
  Truck,
  Image,
  TrendingUp,
  ArrowUpRight,
  Eye,
  Heart,
  MessageCircle,
  IndianRupee,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { PendingWork } from "./pending-work";
import { DashboardTimeFilter } from "./dashboard-time-filter";
import { RefreshMetricsButton } from "@/components/refresh-metrics-button";
import { auth } from "@/lib/auth";
import {
  buildAssetScopeWhere,
  buildCampaignScopeWhere,
  buildCollaborationScopeWhere,
  buildInfluencerScopeWhere,
  buildPaymentScopeWhere,
  buildPrParcelScopeWhere,
} from "@/lib/asset-scope";

type Scope = { userId: string | null; role: string | null | undefined };

async function getStats(scope: Scope) {
  const influencerWhere = buildInfluencerScopeWhere(scope.userId, scope.role);
  const collabWhere = buildCollaborationScopeWhere(scope.userId, scope.role);
  const campaignWhere = buildCampaignScopeWhere(scope.userId, scope.role);
  const paymentWhere = buildPaymentScopeWhere(scope.userId, scope.role);
  const parcelWhere = buildPrParcelScopeWhere(scope.userId, scope.role);
  const assetWhere = buildAssetScopeWhere(scope.userId, scope.role);

  const [
    influencerCount,
    activeCollabCount,
    campaignCount,
    pendingPayments,
    prParcelCount,
    assetCount,
    totalInfluencers,
    completedCollabs,
  ] = await Promise.all([
    prisma.influencer.count({
      where: {
        AND: [influencerWhere, { status: { in: ["active", "onboarded"] } }],
      },
    }),
    prisma.collaboration.count({
      where: {
        AND: [collabWhere, { status: { notIn: ["completed", "cancelled"] } }],
      },
    }),
    prisma.campaign.count({
      where: { AND: [campaignWhere, { status: "active" }] },
    }),
    prisma.payment.count({
      where: { AND: [paymentWhere, { status: "pending" }] },
    }),
    prisma.prParcel.count({
      where: {
        AND: [
          parcelWhere,
          { status: { in: ["preparing", "shipped", "in_transit"] } },
        ],
      },
    }),
    prisma.asset.count({ where: assetWhere }),
    prisma.influencer.count({ where: influencerWhere }),
    prisma.collaboration.count({
      where: { AND: [collabWhere, { status: "completed" }] },
    }),
  ]);

  return {
    influencerCount,
    activeCollabCount,
    campaignCount,
    pendingPayments,
    prParcelCount,
    assetCount,
    totalInfluencers,
    completedCollabs,
  };
}

async function getRecentCollabs(scope: Scope) {
  return prisma.collaboration.findMany({
    where: buildCollaborationScopeWhere(scope.userId, scope.role),
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      influencer: { select: { name: true, instagramHandle: true, tier: true } },
      brand: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });
}

/**
 * Time-scoped performance metrics. Window is anchored on Asset.publishedAt
 * so "Total Views in last 30d" means "views on content that went live in
 * those 30 days". Spend is computed per-asset (collab.payableAmount divided
 * across that collab's assets) so views and spend describe the same
 * artifacts and CPV stays apples-to-apples. Barter collabs contribute views
 * but ₹0 spend (CPV math skips them).
 */
async function getTimedMetrics(from: Date, to: Date, scope: Scope) {
  const assets = await prisma.asset.findMany({
    where: {
      ...buildAssetScopeWhere(scope.userId, scope.role),
      publishedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      views: true,
      likes: true,
      comments: true,
      isViral: true,
      collaboration: {
        select: {
          type: true,
          payableAmount: true,
          agreedAmount: true,
          _count: { select: { assets: true } },
        },
      },
    },
  });

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalSpend = 0;
  let viralCount = 0;
  let paidViewsForCpv = 0; // exclude barter views from CPV denominator

  for (const a of assets) {
    totalViews += a.views ?? 0;
    totalLikes += a.likes ?? 0;
    totalComments += a.comments ?? 0;
    if (a.isViral) viralCount++;

    const collab = a.collaboration;
    if (!collab || collab.type === "barter") continue;
    const total = Number(collab.payableAmount ?? collab.agreedAmount ?? 0);
    const denom = collab._count?.assets || 1;
    if (total > 0) {
      const perAssetCost = total / denom;
      totalSpend += perAssetCost;
      paidViewsForCpv += a.views ?? 0;
    }
  }

  const avgCpv =
    paidViewsForCpv > 0 ? totalSpend / paidViewsForCpv : null;
  // Engagement rate = (likes + comments) / views * 100. Shares/saves often
  // null from scraper so omitted to avoid skewing low.
  const engagementRate =
    totalViews > 0
      ? ((totalLikes + totalComments) / totalViews) * 100
      : null;

  return {
    totalViews,
    totalLikes,
    totalComments,
    totalSpend,
    avgCpv,
    engagementRate,
    viralCount,
    assetCount: assets.length,
  };
}

function parseRange(searchParams: { from?: string; to?: string }): {
  from: Date;
  to: Date;
} {
  const fromStr = searchParams.from;
  const toStr = searchParams.to;
  const now = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = fromStr ? new Date(fromStr) : defaultFrom;
  const to = toStr ? new Date(toStr) : now;
  // Treat `to` as end-of-day so "today" includes content published today.
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function formatCompactInt(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function formatInr(n: number): string {
  return `₹${formatCompactInt(Math.round(n))}`;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  outreach: "bg-amber-50 text-amber-700",
  negotiation: "bg-orange-50 text-orange-700",
  confirmed: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  content_submitted: "bg-purple-50 text-purple-700",
  content_approved: "bg-emerald-50 text-emerald-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export default async function DashboardPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; role?: string }
    | undefined;
  const scope: Scope = {
    userId: sessionUser?.id ?? null,
    role: sessionUser?.role ?? null,
  };
  const { from, to } = parseRange(searchParams);
  const [stats, recentCollabs, timed] = await Promise.all([
    getStats(scope),
    getRecentCollabs(scope),
    getTimedMetrics(from, to, scope),
  ]);

  const metricCards = [
    {
      title: "Total Views",
      value: formatCompactInt(timed.totalViews),
      subtitle: `${timed.assetCount} asset${timed.assetCount === 1 ? "" : "s"} in window`,
      icon: Eye,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      title: "Total Likes",
      value: formatCompactInt(timed.totalLikes),
      subtitle: "across all assets",
      icon: Heart,
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      title: "Total Comments",
      value: formatCompactInt(timed.totalComments),
      subtitle: "discussion volume",
      icon: MessageCircle,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Total Spend",
      value: formatInr(timed.totalSpend),
      subtitle: "paid collabs only (no barter)",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Avg CPV",
      value:
        timed.avgCpv !== null
          ? `₹${timed.avgCpv < 1 ? timed.avgCpv.toFixed(3) : timed.avgCpv.toFixed(2)}`
          : "—",
      subtitle: "cost per view (paid only)",
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Viral Assets",
      value: timed.viralCount.toString(),
      subtitle:
        timed.engagementRate !== null
          ? `Avg ER: ${timed.engagementRate.toFixed(1)}%`
          : "—",
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const cards = [
    {
      title: "Active Influencers",
      value: stats.influencerCount,
      subtitle: `${stats.totalInfluencers} total`,
      icon: Users,
      color: "text-[#A6192E]",
      bg: "bg-[#A6192E]/10",
      href: "/influencers",
    },
    {
      title: "Active Collaborations",
      value: stats.activeCollabCount,
      subtitle: `${stats.completedCollabs} completed`,
      icon: Handshake,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/collaborations",
    },
    {
      title: "Active Campaigns",
      value: stats.campaignCount,
      subtitle: "running now",
      icon: Megaphone,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/campaigns",
    },
    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      subtitle: "awaiting approval",
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/payments",
    },
    {
      title: "In-Transit Parcels",
      value: stats.prParcelCount,
      subtitle: "being shipped",
      icon: Truck,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/pr-parcels",
    },
    {
      title: "Total Assets",
      value: stats.assetCount,
      subtitle: "content pieces",
      icon: Image,
      color: "text-pink-600",
      bg: "bg-pink-50",
      href: "/assets",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-zinc-900"
          style={{ fontFamily: "var(--font-bricolage)" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your influencer operations
        </p>
      </div>

      {/* Time-scoped metrics */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTimeFilter />
          <div className="flex items-center gap-2">
            <RefreshMetricsButton />
            <Link
              href={`/analytics?from=${searchParams.from ?? ""}&to=${searchParams.to ?? ""}`}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              View breakdown
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((card) => (
            <Card
              key={card.title}
              className="border-zinc-200/80 transition-all hover:border-zinc-300 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-500">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{card.subtitle}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="group relative overflow-hidden border-zinc-200/80 transition-all hover:border-zinc-300 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-500">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{card.subtitle}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Per-user pending work — fetched client-side via SWR (session-specific, can't be ISR'd) */}
      <PendingWork />

      {/* Recent Collaborations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Recent Collaborations
          </h2>
          <Link
            href="/collaborations"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            View all
          </Link>
        </div>
        <Card className="border-zinc-200/80">
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {recentCollabs.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  No collaborations yet
                </p>
              ) : (
                recentCollabs.map((collab) => (
                  <Link
                    key={collab.id}
                    href={`/collaborations/${collab.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A6192E] text-[11px] font-medium text-white">
                        {collab.influencer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {collab.influencer.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {collab.brand.name}
                          {collab.influencer.instagramHandle &&
                            ` · @${collab.influencer.instagramHandle}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          statusColors[collab.status] || "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {collab.status.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium capitalize text-zinc-600">
                        {collab.type.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
