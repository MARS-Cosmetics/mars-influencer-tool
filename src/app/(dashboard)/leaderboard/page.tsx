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
import { Trophy, TrendingUp, Eye, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  totalViews: number;
  collabCount: number;
  avgCPV: number;
  allBarter: boolean;
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

function formatWeekLabel(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  end.setUTCDate(end.getUTCDate() - 1); // end is exclusive Monday, show Sunday
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const startLabel = start.toLocaleDateString("en-IN", opts);
  const endLabel = end.toLocaleDateString("en-IN", yearOpts);
  return `${startLabel} - ${endLabel}`;
}

function formatMonthLabel(startStr: string): string {
  const start = new Date(startStr);
  return start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
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

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const periodLabel = data
    ? period === "weekly"
      ? formatWeekLabel(data.periodStart, data.periodEnd)
      : formatMonthLabel(data.periodStart)
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#A6192E]/10">
          <Trophy className="h-5 w-5 text-[#A6192E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Team performance rankings
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Toggle */}
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

        {/* Date Navigator */}
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

      {/* Summary Cards */}
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
                  ? `Score: ${formatIndian(data.summary.topPerformer.score)}`
                  : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Table */}
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
                  <TableHead className="text-right">Avg CPV</TableHead>
                  <TableHead>Top Collab</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    className={getRowHighlight(entry.rank)}
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
                    <TableCell className="text-right font-semibold">
                      {formatIndian(entry.score)}
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
                        formatCPV(entry.avgCPV)
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
    </div>
  );
}
