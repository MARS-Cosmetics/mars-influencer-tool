"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, ExternalLink, Flame } from "lucide-react";
import type { AssetRow, InfluencerRow, Totals } from "@/lib/analytics";
import { formatCompactInt, formatInr, formatCpv } from "./format";

type SortKey = "views" | "spend" | "cpv" | "engagement" | "assets";
type SortDir = "desc" | "asc";

const TIER_BADGE: Record<string, string> = {
  nano: "bg-zinc-100 text-zinc-700",
  micro: "bg-blue-100 text-blue-700",
  mid: "bg-indigo-100 text-indigo-700",
  macro: "bg-purple-100 text-purple-700",
  mega: "bg-pink-100 text-pink-700",
  unknown: "bg-zinc-50 text-zinc-500",
};

const DEFAULT_TOP_N = 10;

export function BreakdownTable({
  perInfluencer,
  assetsByInfluencer,
  totals,
}: {
  perInfluencer: InfluencerRow[];
  assetsByInfluencer: Record<string, AssetRow[]>;
  totals: Totals;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = perInfluencer;
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.handle ?? "").toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = sortVal(a, sortKey);
      const bv = sortVal(b, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * dir;
    });
    return rows;
  }, [perInfluencer, sortKey, sortDir, search]);

  const visible = showAll || search ? filtered : filtered.slice(0, DEFAULT_TOP_N);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Performance breakdown</h2>
          <p className="text-xs text-zinc-500">
            Click a row to drill into per-asset numbers. Sort by any column.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search influencer or handle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-64 rounded-md border border-zinc-200 px-3 text-xs outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="w-[44px]" />
              <th className="px-3 py-2.5 font-medium">Influencer</th>
              <SortHeader
                label="Assets"
                colKey="assets"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Views"
                colKey="views"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Engagement"
                colKey="engagement"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Spend"
                colKey="spend"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="CPV"
                colKey="cpv"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <tr className="bg-zinc-900 text-white">
              <td className="w-[44px]" />
              <td className="px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider">
                Total ({totals.influencerCount})
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">{totals.assetCount}</td>
              <td className="px-3 py-2.5 text-right font-semibold">
                {formatCompactInt(totals.totalViews)}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">
                {totals.engagementRate !== null
                  ? `${totals.engagementRate.toFixed(1)}%`
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">
                {formatInr(totals.totalSpend)}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">
                {formatCpv(totals.avgCpv)}
              </td>
            </tr>

            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-400">
                  No assets published in this window.
                </td>
              </tr>
            )}

            {visible.map((r) => {
              const isOpen = expanded.has(r.influencerId);
              const assets = assetsByInfluencer[r.influencerId] ?? [];
              return (
                <FragmentRow
                  key={r.influencerId}
                  row={r}
                  assets={assets}
                  isOpen={isOpen}
                  onToggle={() => toggleExpand(r.influencerId)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {!search && filtered.length > DEFAULT_TOP_N && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Showing {visible.length} of {filtered.length} influencers
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="rounded-md border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {showAll ? `Show top ${DEFAULT_TOP_N}` : `Show all ${filtered.length}`}
          </button>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  row,
  assets,
  isOpen,
  onToggle,
}: {
  row: InfluencerRow;
  assets: AssetRow[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition-colors hover:bg-zinc-50/80"
      >
        <td className="w-[44px] py-3 pl-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A6192E] text-[11px] font-medium text-white">
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/influencers/${row.influencerId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-zinc-900 hover:underline"
              >
                {row.name}
              </Link>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                {row.handle && <span>@{row.handle}</span>}
                {row.tier && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-medium capitalize ${
                      TIER_BADGE[row.tier] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {row.tier}
                  </span>
                )}
                {row.viralCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700">
                    <Flame className="h-3 w-3" />
                    {row.viralCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-right text-sm text-zinc-700">{row.assetCount}</td>
        <td className="px-3 py-3 text-right text-sm font-medium text-zinc-900">
          {formatCompactInt(row.views)}
        </td>
        <td className="px-3 py-3 text-right text-sm text-zinc-700">
          {row.engagementRate !== null ? `${row.engagementRate.toFixed(1)}%` : "—"}
        </td>
        <td className="px-3 py-3 text-right text-sm font-medium text-zinc-900">
          {row.spend > 0 ? formatInr(row.spend) : "—"}
        </td>
        <td className="px-3 py-3 text-right text-sm text-zinc-700">
          {formatCpv(row.cpv)}
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-zinc-50/40">
          <td colSpan={7} className="p-0">
            <div className="border-t border-zinc-100 px-3 py-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-400">
                    <th className="px-2 py-1.5 font-medium">Asset</th>
                    <th className="px-2 py-1.5 font-medium">Published</th>
                    <th className="px-2 py-1.5 text-right font-medium">Views</th>
                    <th className="px-2 py-1.5 text-right font-medium">Likes</th>
                    <th className="px-2 py-1.5 text-right font-medium">Comments</th>
                    <th className="px-2 py-1.5 text-right font-medium">Spend</th>
                    <th className="px-2 py-1.5 text-right font-medium">CPV</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-3 text-center text-xs text-zinc-400">
                        No assets in this window.
                      </td>
                    </tr>
                  )}
                  {assets.map((a) => (
                    <tr key={a.id} className="border-t border-zinc-100/60">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600">
                            {a.platform}
                          </span>
                          <span className="text-xs text-zinc-600 capitalize">
                            {a.contentType.replace(/_/g, " ")}
                          </span>
                          {a.isViral && (
                            <Flame className="h-3 w-3 text-orange-500" />
                          )}
                          {a.contentUrl && (
                            <a
                              href={a.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-zinc-400 hover:text-zinc-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-zinc-500">
                        {a.publishedAt
                          ? a.publishedAt.toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-900">
                        {formatCompactInt(a.views)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-600">
                        {formatCompactInt(a.likes)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-600">
                        {formatCompactInt(a.comments)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-900">
                        {a.spend > 0 ? formatInr(a.spend) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-700">
                        {formatCpv(a.cpv)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SortHeader({
  label,
  colKey,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "right" | "left";
}) {
  const active = sortKey === colKey;
  return (
    <th
      className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(colKey)}
        className={`inline-flex items-center gap-0.5 ${active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
      >
        {label}
        {active && <span className="text-[9px]">{sortDir === "desc" ? "▼" : "▲"}</span>}
      </button>
    </th>
  );
}

function sortVal(r: InfluencerRow, key: SortKey): number | null {
  switch (key) {
    case "views":
      return r.views;
    case "spend":
      return r.spend;
    case "cpv":
      return r.cpv;
    case "engagement":
      return r.engagementRate;
    case "assets":
      return r.assetCount;
  }
}
