import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
  Heart,
  MessageCircle,
  IndianRupee,
  TrendingUp,
  Flame,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import type { Totals } from "@/lib/analytics";
import { formatCompactInt, formatInr, formatCpv } from "./format";

type CardSpec = {
  title: string;
  value: string;
  current: number | null;
  previous: number | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  inverted?: boolean; // lower is better (CPV)
};

function pctDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return null; // can't compute % from zero baseline
  }
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({
  current,
  previous,
  inverted,
}: {
  current: number | null;
  previous: number | null;
  inverted?: boolean;
}) {
  const delta = pctDelta(current, previous);
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400">
        <Minus className="h-3 w-3" /> no prior data
      </span>
    );
  }
  const isUp = delta > 0.5;
  const isDown = delta < -0.5;
  const flat = !isUp && !isDown;
  // For CPV (inverted=true), down is good.
  const good = inverted ? isDown : isUp;
  const bad = inverted ? isUp : isDown;
  const cls = flat
    ? "text-zinc-500 bg-zinc-100"
    : good
      ? "text-emerald-700 bg-emerald-50"
      : bad
        ? "text-red-700 bg-red-50"
        : "text-zinc-500 bg-zinc-100";
  const Icon = flat ? Minus : isUp ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function KpiCards({
  totals,
  previous,
}: {
  totals: Totals;
  previous: Totals | null;
}) {
  const cards: CardSpec[] = [
    {
      title: "Views",
      value: formatCompactInt(totals.totalViews),
      current: totals.totalViews,
      previous: previous?.totalViews ?? null,
      icon: Eye,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      title: "Spend",
      value: formatInr(totals.totalSpend),
      current: totals.totalSpend,
      previous: previous?.totalSpend ?? null,
      icon: IndianRupee,
      color: "text-[#A6192E]",
      bg: "bg-[#A6192E]/10",
    },
    {
      title: "Avg CPV",
      value: formatCpv(totals.avgCpv),
      current: totals.avgCpv,
      previous: previous?.avgCpv ?? null,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      inverted: true,
    },
    {
      title: "Engagement",
      value:
        totals.engagementRate !== null
          ? `${totals.engagementRate.toFixed(1)}%`
          : "—",
      current: totals.engagementRate,
      previous: previous?.engagementRate ?? null,
      icon: Heart,
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      title: "Influencers",
      value: totals.influencerCount.toString(),
      current: totals.influencerCount,
      previous: previous?.influencerCount ?? null,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Viral assets",
      value: totals.viralCount.toString(),
      current: totals.viralCount,
      previous: previous?.viralCount ?? null,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.title} className="border-zinc-200/80">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-zinc-500">{c.title}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                  {c.value}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <DeltaBadge
                    current={c.current}
                    previous={c.previous}
                    inverted={c.inverted}
                  />
                  <span>vs prior period</span>
                </div>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg}`}
              >
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ComparisonHint({
  totals,
  previous,
  from,
  to,
}: {
  totals: Totals;
  previous: Totals | null;
  from: Date;
  to: Date;
}) {
  if (!previous || previous.assetCount === 0) return null;
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return (
    <p className="text-[11px] text-zinc-400">
      Comparing to the previous {days}-day window —{" "}
      {totals.assetCount} vs {previous.assetCount} published assets.
    </p>
  );
}
