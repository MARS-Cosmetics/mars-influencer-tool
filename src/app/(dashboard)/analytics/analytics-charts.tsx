"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type {
  SeriesPoint,
  TierPoint,
  CategoryPoint,
  TopRow,
} from "@/lib/analytics";
import {
  formatCompactInt,
  formatInr,
  formatCpv,
  formatChartDate,
  formatChartDateFull,
} from "./format";

// ============================================================================
// Section: time-series trends — one line per chart, no dual axes.
// ============================================================================

export function TrendSection({ data }: { data: SeriesPoint[] }) {
  return (
    <Section title="Trends over time" caption="One line per metric. Easy to read — no shared axes, no decoder ring.">
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard
          title="Daily views"
          caption="How much reach is your content getting each day?"
          data={data}
          dataKey="views"
          color="#0284c7"
          valueFormatter={(n) => (n === null ? "—" : formatCompactInt(n))}
        />
        <TrendCard
          title="Daily spend"
          caption="How much you paid influencers per day (allocated per asset)."
          data={data}
          dataKey="spend"
          color="#A6192E"
          valueFormatter={(n) => (n === null ? "—" : formatInr(n))}
        />
        <TrendCard
          title="Daily engagement rate"
          caption="(Likes + comments) / views, as a %."
          data={data}
          dataKey="engagementRate"
          color="#9333ea"
          valueFormatter={(n) => (n === null ? "—" : `${n.toFixed(1)}%`)}
        />
      </div>
    </Section>
  );
}

function TrendCard({
  title,
  caption,
  data,
  dataKey,
  color,
  valueFormatter,
}: {
  title: string;
  caption: string;
  data: SeriesPoint[];
  dataKey: keyof SeriesPoint;
  color: string;
  valueFormatter: (n: number | null) => string;
}) {
  return (
    <Card className="border-zinc-200/80">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mb-2 text-[11px] text-zinc-500">{caption}</p>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                stroke="#a1a1aa"
                tick={{ fontSize: 10 }}
                minTickGap={20}
              />
              <YAxis
                stroke="#a1a1aa"
                tick={{ fontSize: 10 }}
                tickFormatter={(n: number) => valueFormatter(n)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
                labelFormatter={(label: unknown) =>
                  typeof label === "string" ? formatChartDateFull(label) : String(label)
                }
                formatter={(value: unknown) => {
                  const n = typeof value === "number" ? value : null;
                  return [valueFormatter(n), title];
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section: top performers — horizontal bars, longest = best.
// ============================================================================

export function TopPerformersSection({
  topByViews,
  topByEngagement,
  topByCpv,
}: {
  topByViews: TopRow[];
  topByEngagement: TopRow[];
  topByCpv: TopRow[];
}) {
  return (
    <Section
      title="Top performers"
      caption="Who's actually driving results in this window. Longer bar = better."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <HorizontalBarCard
          title="Top by views"
          caption="Highest-reach creators. Pick more like these."
          data={topByViews}
          color="#0284c7"
          valueFormatter={formatCompactInt}
          emptyText="No published assets in this window."
        />
        <HorizontalBarCard
          title="Top by engagement rate"
          caption="Audience actually cares. Min 3 assets to qualify (filters out one-hit wonders)."
          data={topByEngagement}
          color="#9333ea"
          valueFormatter={(n) => `${n.toFixed(1)}%`}
          emptyText="No influencer has 3+ published assets in this window."
        />
        <HorizontalBarCard
          title="Best CPV (cheapest views)"
          caption="Best ₹/view ratio. Min ₹1000 spend so a tiny collab doesn't win unfairly."
          data={topByCpv}
          color="#16a34a"
          valueFormatter={(n) => formatCpv(n)}
          ascending
          emptyText="Not enough paid collabs with ≥₹1000 spend to rank."
        />
      </div>
    </Section>
  );
}

function HorizontalBarCard({
  title,
  caption,
  data,
  color,
  valueFormatter,
  ascending = false,
  emptyText,
}: {
  title: string;
  caption: string;
  data: TopRow[];
  color: string;
  valueFormatter: (n: number) => string;
  ascending?: boolean;
  emptyText: string;
}) {
  const chartData = data.map((r) => ({
    name: r.name,
    value: r.value,
    handle: r.handle,
  }));
  const height = Math.max(180, chartData.length * 28);

  return (
    <Card className="border-zinc-200/80">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mb-3 text-[11px] text-zinc-500">{caption}</p>
        {chartData.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center rounded-md bg-zinc-50/60 text-xs text-zinc-400">
            {emptyText}
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  hide
                  domain={ascending ? [0, "dataMax"] : [0, "dataMax"]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "#52525b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => {
                    const n = typeof value === "number" ? value : 0;
                    return [valueFormatter(n), title];
                  }}
                  cursor={{ fill: "#f4f4f5" }}
                />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: unknown) => {
                      const n = typeof v === "number" ? v : 0;
                      return valueFormatter(n);
                    }}
                    style={{ fontSize: 11, fill: "#3f3f46", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section: tier — three single-metric bar charts, NOT one dual-axis chart.
// ============================================================================

export function TierSection({ data }: { data: TierPoint[] }) {
  return (
    <Section
      title="Performance by tier"
      caption="Each chart shows ONE thing. Compare across tiers without doing math in your head."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <VerticalBarCard
          title="Views per tier"
          caption="Which tier is delivering reach?"
          data={data}
          dataKey="views"
          labelKey="tier"
          color="#0284c7"
          valueFormatter={formatCompactInt}
        />
        <VerticalBarCard
          title="Spend per tier"
          caption="Where is your money going?"
          data={data}
          dataKey="spend"
          labelKey="tier"
          color="#A6192E"
          valueFormatter={formatInr}
        />
        <VerticalBarCard
          title="CPV per tier (lower = better)"
          caption="Cost per view. The shortest bar wins."
          data={data.filter((d) => d.cpv !== null)}
          dataKey="cpv"
          labelKey="tier"
          color="#16a34a"
          valueFormatter={(n) => formatCpv(n)}
        />
      </div>
    </Section>
  );
}

// ============================================================================
// Section: content mix — by content type, platform, collab type.
// ============================================================================

export function MixSection({
  byContentType,
  byPlatform,
  byCollabType,
}: {
  byContentType: CategoryPoint[];
  byPlatform: CategoryPoint[];
  byCollabType: CategoryPoint[];
}) {
  return (
    <Section
      title="What kind of content works?"
      caption="Splits by content type, platform, and collab type. All sorted biggest first."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryHorizontalCard
          title="Views by content type"
          caption="Reels vs carousels vs static. Which format moves the needle?"
          data={byContentType}
          dataKey="views"
          color="#0284c7"
          valueFormatter={formatCompactInt}
        />
        <CategoryHorizontalCard
          title="Views by platform"
          caption="Where your reach is concentrated."
          data={byPlatform}
          dataKey="views"
          color="#9333ea"
          valueFormatter={formatCompactInt}
        />
        <CategoryHorizontalCard
          title="Views by collab type"
          caption="Are paid collabs out-pulling barter or PR gifting?"
          data={byCollabType}
          dataKey="views"
          color="#16a34a"
          valueFormatter={formatCompactInt}
        />
      </div>
    </Section>
  );
}

function CategoryHorizontalCard({
  title,
  caption,
  data,
  dataKey,
  color,
  valueFormatter,
}: {
  title: string;
  caption: string;
  data: CategoryPoint[];
  dataKey: "views" | "spend";
  color: string;
  valueFormatter: (n: number) => string;
}) {
  const chartData = data.map((d) => ({
    name: d.label,
    value: d[dataKey],
  }));
  const height = Math.max(180, chartData.length * 32);

  return (
    <Card className="border-zinc-200/80">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mb-3 text-[11px] text-zinc-500">{caption}</p>
        {chartData.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center rounded-md bg-zinc-50/60 text-xs text-zinc-400">
            No data in window.
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: "#52525b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => {
                    const n = typeof value === "number" ? value : 0;
                    return [valueFormatter(n), title];
                  }}
                  cursor={{ fill: "#f4f4f5" }}
                />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: unknown) => {
                      const n = typeof v === "number" ? v : 0;
                      return valueFormatter(n);
                    }}
                    style={{ fontSize: 11, fill: "#3f3f46", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VerticalBarCard({
  title,
  caption,
  data,
  dataKey,
  labelKey,
  color,
  valueFormatter,
}: {
  title: string;
  caption: string;
  data: TierPoint[];
  dataKey: "views" | "spend" | "cpv";
  labelKey: "tier";
  color: string;
  valueFormatter: (n: number) => string;
}) {
  const chartData = data
    .map((d) => ({
      name:
        d[labelKey].charAt(0).toUpperCase() + d[labelKey].slice(1),
      value: dataKey === "cpv" ? d.cpv ?? 0 : d[dataKey],
    }))
    .filter((d) => d.value > 0);

  return (
    <Card className="border-zinc-200/80">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mb-3 text-[11px] text-zinc-500">{caption}</p>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center rounded-md bg-zinc-50/60 text-xs text-zinc-400">
            No data in window.
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#a1a1aa"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(n: number) => valueFormatter(n)}
                  width={48}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => {
                    const n = typeof value === "number" ? value : 0;
                    return [valueFormatter(n), title];
                  }}
                  cursor={{ fill: "#f4f4f5" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: unknown) => {
                      const n = typeof v === "number" ? v : 0;
                      return valueFormatter(n);
                    }}
                    style={{ fontSize: 11, fill: "#3f3f46", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section wrapper.
// ============================================================================

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="text-xs text-zinc-500">{caption}</p>
      </div>
      {children}
    </div>
  );
}
