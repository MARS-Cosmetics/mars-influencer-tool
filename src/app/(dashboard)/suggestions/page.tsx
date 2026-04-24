export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuggestionStatus } from "@/generated/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { SuggestionRowActions } from "./row-actions";

type Tab = "pending" | "approved" | "rejected";

const TAB_LABEL: Record<Tab, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDateTime(d: Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700",
  youtube: "bg-red-100 text-red-700",
  tiktok: "bg-slate-200 text-slate-700",
};

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "approved" || rawTab === "rejected" ? rawTab : "pending";

  const userId = session.user.id as string;

  const [suggestions, counts] = await Promise.all([
    prisma.influencerSuggestion.findMany({
      where: {
        assignedToUserId: userId,
        status: tab as SuggestionStatus,
      },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { name: true } },
        promotedInfluencer: { select: { id: true, name: true, instagramHandle: true } },
      },
      take: 200,
    }),
    prisma.influencerSuggestion.groupBy({
      by: ["status"],
      where: { assignedToUserId: userId },
      _count: { _all: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.status] = c._count._all;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suggestions</h1>
          <p className="text-sm text-muted-foreground">
            Influencer suggestions submitted to you via the Telegram bot.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = t === tab;
          const count = countMap[t] ?? 0;
          return (
            <Link
              key={t}
              href={`/suggestions?tab=${t}`}
              className={
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-[#A6192E] text-[#A6192E]"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {TAB_LABEL[t]}
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs " +
                  (active ? "bg-[#A6192E] text-white" : "bg-muted text-muted-foreground")
                }
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">No {tab} suggestions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Received</TableHead>
                  {tab === "pending" ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : (
                    <TableHead>Outcome</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <a
                        href={s.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {s.handle ? `@${s.handle}` : s.profileUrl}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge className={PLATFORM_COLORS[s.platform] ?? "bg-gray-100 text-gray-700"}>
                        {s.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.submittedByName ?? "—"}
                      {s.telegramUsername && (
                        <div className="text-xs text-muted-foreground">@{s.telegramUsername}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {s.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    {tab === "pending" ? (
                      <TableCell className="text-right">
                        <SuggestionRowActions
                          id={s.id}
                          platform={s.platform}
                          handle={s.handle}
                        />
                      </TableCell>
                    ) : (
                      <TableCell className="text-sm">
                        {s.status === "approved" && s.promotedInfluencer ? (
                          <Link
                            href={`/influencers/${s.promotedInfluencer.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            → {s.promotedInfluencer.name}
                          </Link>
                        ) : s.reviewerNote ? (
                          <span className="text-muted-foreground">{s.reviewerNote}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          by {s.reviewedBy?.name ?? "—"} · {formatDateTime(s.reviewedAt)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
