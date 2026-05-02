"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  TrendingUp,
  Eye,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  components: {
    reach: number;
    efficiency: number;
    volume: number;
    quality: number;
  };
  totalViews: number;
  collabCount: number;
  medianCPV: number;
  totalSpent: number;
  allBarter: boolean;
  hasRatings: boolean;
  topCollaboration: string | null;
}

interface LeaderboardData {
  period: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    totalCollaborations: number;
    totalViews: number;
    avgCPV: number;
    topPerformer: { name: string; score: number } | null;
  };
  leaderboard: LeaderboardEntry[];
}

interface UserDetail {
  user: { id: string; name: string; email: string };
  period: { type: string; start: string; end: string };
  summary: {
    collabCount: number;
    totalViews: number;
    totalSpent: number;
    avgCPV: number;
    allBarter: boolean;
  };
  collabs: Array<{
    collabId: string;
    influencer: { id: string; name: string; handle: string | null };
    campaign: string | null;
    type: string;
    status: string;
    agreedAmount: number;
    views: number;
    cpv: number;
    approvedAt: string;
  }>;
}

function formatIndian(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompact(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatIndian(value);
}

function formatCPV(value: number): string {
  return `\u20B9${value.toFixed(2)}`;
}

function formatINR(value: number): string {
  return `\u20B9${formatIndian(value)}`;
}

function formatWeekLabel(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  end.setUTCDate(end.getUTCDate() - 1);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  return `${start.toLocaleDateString("en-IN", opts)} - ${end.toLocaleDateString("en-IN", yearOpts)}`;
}

function formatMonthLabel(startStr: string): string {
  return new Date(startStr).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shiftDate(dateStr: string, period: string, direction: number): string {
  const d = new Date(dateStr);
  if (period === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + direction);
  } else {
    d.setUTCDate(d.getUTCDate() + direction * 7);
  }
  return d.toISOString().split("T")[0];
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47 1";
  if (rank === 2) return "\uD83E\uDD48 2";
  if (rank === 3) return "\uD83E\uDD49 3";
  return String(rank);
}

function getRowHighlight(rank: number): string {
  if (rank === 1) return "bg-yellow-50/80";
  if (rank === 2) return "bg-gray-50/80";
  if (rank === 3) return "bg-orange-50/60";
  return "";
}

function scoreBadgeClass(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800";
  if (score >= 5) return "bg-blue-100 text-blue-800";
  if (score >= 1) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-700";
}

function ComponentBar({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const barColor =
    value >= 8
      ? "bg-green-500"
      : value >= 5
        ? "bg-blue-500"
        : value >= 1
          ? "bg-yellow-500"
          : "bg-gray-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
          {hint ? (
            <span className="ml-1 text-[10px] italic">{hint}</span>
          ) : null}
        </span>
        <span className="font-medium tabular-nums">
          {value.toFixed(1)} / 10
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<LeaderboardEntry | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?period=${period}&date=${currentDate}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [period, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch detail when a row is clicked
  useEffect(() => {
    if (!detailUserId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/leaderboard/user/${detailUserId}?period=${period}&date=${currentDate}`
        );
        if (res.ok) {
          setDetail(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch user detail:", err);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [detailUserId, period, currentDate]);

  const periodLabel = data
    ? period === "weekly"
      ? formatWeekLabel(data.periodStart, data.periodEnd)
      : formatMonthLabel(data.periodStart)
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#A6192E]/10">
          <Trophy className="h-5 w-5 text-[#A6192E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Team performance rankings · score 0–10 (top performer = 10)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <button
            onClick={() => setPeriod("weekly")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              period === "weekly"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              period === "monthly"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(shiftDate(currentDate, period, -1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {loading ? "Loading..." : periodLabel}
          </span>
          <button
            onClick={() => setCurrentDate(shiftDate(currentDate, period, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collaborations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatIndian(data.summary.totalCollaborations)}
              </div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views Generated
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCompact(data.summary.totalViews)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatIndian(data.summary.totalViews)} views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average CPV
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.avgCPV > 0
                  ? formatCPV(data.summary.avgCPV)
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Cost per view</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Performer
              </CardTitle>
              <Trophy className="h-4 w-4 text-[#A6192E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {data.summary.topPerformer?.name || "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.summary.topPerformer
                  ? `Score: ${data.summary.topPerformer.score.toFixed(1)} / 10`
                  : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-muted-foreground">
                Loading leaderboard...
              </div>
            </div>
          ) : data && data.leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Collaborations</TableHead>
                  <TableHead className="text-right">Total Views</TableHead>
                  <TableHead className="text-right">Median CPV</TableHead>
                  <TableHead>Top Collab</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    className={`${getRowHighlight(entry.rank)} cursor-pointer hover:bg-muted/50`}
                    onClick={() => {
                      setDetailEntry(entry);
                      setDetailUserId(entry.userId);
                    }}
                  >
                    <TableCell className="font-semibold">
                      {getRankDisplay(entry.rank)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.userName}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.userEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={scoreBadgeClass(entry.score)}>
                        {entry.score.toFixed(1)} / 10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.collabCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCompact(entry.totalViews)}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.allBarter ? (
                        <Badge variant="secondary" className="text-xs">
                          Barter
                        </Badge>
                      ) : (
                        formatCPV(entry.medianCPV)
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.topCollaboration ? (
                        <span className="text-sm">
                          {entry.topCollaboration.startsWith("@")
                            ? entry.topCollaboration
                            : `@${entry.topCollaboration}`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Trophy className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No leaderboard data for this period
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Click any row to see that user&apos;s collab-by-collab breakdown.
      </p>

      <Dialog
        open={!!detailUserId}
        onOpenChange={(o) => {
          if (!o) {
            setDetailUserId(null);
            setDetailEntry(null);
          }
        }}
      >
        <DialogContent className="!max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail
                ? `${detail.user.name} — breakdown`
                : "Loading…"}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {detailEntry && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Score breakdown
                    </div>
                    <div className="text-2xl font-bold">
                      {detailEntry.score.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / 10
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ComponentBar
                      label="Reach (35%)"
                      value={detailEntry.components.reach}
                    />
                    <ComponentBar
                      label="Efficiency (25%)"
                      value={detailEntry.components.efficiency}
                      hint={
                        detailEntry.allBarter
                          ? "(neutral — all-barter)"
                          : undefined
                      }
                    />
                    <ComponentBar
                      label="Volume (20%)"
                      value={detailEntry.components.volume}
                    />
                    <ComponentBar
                      label="Quality (20%)"
                      value={detailEntry.components.quality}
                      hint={
                        !detailEntry.hasRatings
                          ? "(neutral — no ratings logged)"
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Collabs</div>
                  <div className="text-lg font-semibold">
                    {detail.summary.collabCount}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Views</div>
                  <div className="text-lg font-semibold">
                    {formatCompact(detail.summary.totalViews)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Spent</div>
                  <div className="text-lg font-semibold">
                    {formatINR(detail.summary.totalSpent)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Avg CPV</div>
                  <div className="text-lg font-semibold">
                    {detail.summary.allBarter
                      ? "Barter"
                      : detail.summary.avgCPV > 0
                        ? formatCPV(detail.summary.avgCPV)
                        : "—"}
                  </div>
                </div>
              </div>

              {detail.collabs.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No collaborations approved in this period.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">CPV</TableHead>
                        <TableHead>Approved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.collabs.map((c) => (
                        <TableRow key={c.collabId}>
                          <TableCell>
                            <div className="font-medium">
                              {c.influencer.name}
                            </div>
                            {c.influencer.handle && (
                              <div className="text-xs text-muted-foreground">
                                @{c.influencer.handle}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.campaign ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                c.type === "paid"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }
                            >
                              {c.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {c.agreedAmount > 0 ? formatINR(c.agreedAmount) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCompact(c.views)}
                          </TableCell>
                          <TableCell className="text-right">
                            {c.cpv > 0 ? formatCPV(c.cpv) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(c.approvedAt).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short" }
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Failed to load details.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
