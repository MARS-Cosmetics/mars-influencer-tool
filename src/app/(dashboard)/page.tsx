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
} from "lucide-react";
import Link from "next/link";

async function getStats() {
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
      where: { status: { in: ["active", "onboarded"] } },
    }),
    prisma.collaboration.count({
      where: { status: { notIn: ["completed", "cancelled"] } },
    }),
    prisma.campaign.count({ where: { status: "active" } }),
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.prParcel.count({
      where: { status: { in: ["preparing", "shipped", "in_transit"] } },
    }),
    prisma.asset.count(),
    prisma.influencer.count(),
    prisma.collaboration.count({ where: { status: "completed" } }),
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

async function getRecentCollabs() {
  return prisma.collaboration.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      influencer: { select: { name: true, instagramHandle: true, tier: true } },
      brand: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });
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

export default async function DashboardPage() {
  const [stats, recentCollabs] = await Promise.all([
    getStats(),
    getRecentCollabs(),
  ]);

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
