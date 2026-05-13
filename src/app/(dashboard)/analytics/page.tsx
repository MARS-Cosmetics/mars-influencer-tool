export const dynamic = "force-dynamic";

import { DashboardTimeFilter } from "../dashboard-time-filter";
import { getAnalyticsBreakdown } from "@/lib/analytics";
import { BreakdownTable } from "./breakdown-table";
import {
  TrendSection,
  TopPerformersSection,
  TierSection,
  MixSection,
} from "./analytics-charts";
import { KpiCards, ComparisonHint } from "./kpi-cards";

function parseRange(searchParams: { from?: string; to?: string }): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to) : now;
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { from, to } = parseRange(searchParams);
  const data = await getAnalyticsBreakdown(from, to);

  return (
    <div className="space-y-10">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-zinc-900"
          style={{ fontFamily: "var(--font-bricolage)" }}
        >
          Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Plain-English breakdown of how your influencer content performed in this window.
        </p>
      </div>

      <div className="space-y-3">
        <DashboardTimeFilter />
        <ComparisonHint
          totals={data.totals}
          previous={data.previousTotals}
          from={from}
          to={to}
        />
      </div>

      <KpiCards totals={data.totals} previous={data.previousTotals} />

      <TrendSection data={data.timeSeries} />

      <TopPerformersSection
        topByViews={data.topByViews}
        topByEngagement={data.topByEngagement}
        topByCpv={data.topByCpv}
      />

      <TierSection data={data.byTier} />

      <MixSection
        byContentType={data.byContentType}
        byPlatform={data.byPlatform}
        byCollabType={data.byCollabType}
      />

      <BreakdownTable
        perInfluencer={data.perInfluencer}
        assetsByInfluencer={data.assetsByInfluencer}
        totals={data.totals}
      />
    </div>
  );
}
