"use client";

import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, Image as ImageIcon, Handshake } from "lucide-react";

type PendingResponse = {
  summary: {
    pendingCollabs: number;
    pendingAssets: number;
    overdueCollabs: number;
  };
  collabs: Array<{
    id: string;
    status: string;
    type: string;
    dueDate: string | null;
    updatedAt: string;
    influencer: { id: string; name: string; instagramHandle: string | null };
    brand: { name: string };
    campaign: { name: string } | null;
  }>;
  assets: Array<{
    id: string;
    status: string;
    platform: string;
    contentType: string;
    dueDate: string | null;
    collaborationId: string;
    influencer: { name: string; instagramHandle: string | null };
  }>;
};

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  brief_sent: "bg-amber-100 text-amber-700",
  agreed: "bg-blue-100 text-blue-700",
  content_in_progress: "bg-indigo-100 text-indigo-700",
  content_submitted: "bg-purple-100 text-purple-700",
  content_approved: "bg-emerald-100 text-emerald-700",
  content_published: "bg-green-100 text-green-700",
  pending: "bg-zinc-100 text-zinc-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  published: "bg-green-100 text-green-700",
};

function formatDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(d) < today;
}

export function PendingWork() {
  const { data, isLoading, error } = useSWR<PendingResponse>(
    "/api/me/pending",
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { summary, collabs, assets } = data;
  const hasNothing =
    summary.pendingCollabs === 0 && summary.pendingAssets === 0;

  if (hasNothing) {
    return (
      <Card className="border-zinc-200/80">
        <CardContent className="flex items-center gap-3 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Handshake className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">All caught up</p>
            <p className="text-xs text-zinc-500">
              No pending collaborations or assets assigned to you.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Your pending work</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Handshake className="h-3 w-3" /> {summary.pendingCollabs} collab
            {summary.pendingCollabs !== 1 ? "s" : ""}
          </span>
          <span className="text-zinc-300">·</span>
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> {summary.pendingAssets} asset
            {summary.pendingAssets !== 1 ? "s" : ""}
          </span>
          {summary.overdueCollabs > 0 && (
            <>
              <span className="text-zinc-300">·</span>
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3 w-3" />
                {summary.overdueCollabs} overdue
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending collabs */}
        <Card className="border-zinc-200/80">
          <CardContent className="p-0">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-medium text-zinc-900">
                Active collaborations
              </h3>
            </div>
            <div className="divide-y divide-zinc-100">
              {collabs.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">
                  No active collaborations
                </p>
              ) : (
                collabs.slice(0, 8).map((c) => {
                  const overdue = isOverdue(c.dueDate);
                  return (
                    <Link
                      key={c.id}
                      href={`/collaborations/${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {c.influencer.name}
                          {c.influencer.instagramHandle && (
                            <span className="ml-1 text-xs text-zinc-400">
                              @{c.influencer.instagramHandle}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {c.brand.name}
                          {c.campaign?.name && ` · ${c.campaign.name}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={statusColors[c.status] || "bg-zinc-100"}>
                          {c.status.replace(/_/g, " ")}
                        </Badge>
                        {c.dueDate && (
                          <span
                            className={`flex items-center gap-1 text-[10px] ${
                              overdue ? "text-red-600" : "text-zinc-400"
                            }`}
                          >
                            {overdue && <AlertCircle className="h-3 w-3" />}
                            <Clock className="h-3 w-3" />
                            {formatDate(c.dueDate)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
              {collabs.length > 8 && (
                <Link
                  href="/collaborations"
                  className="block px-4 py-2 text-center text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  See all {collabs.length} →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending assets */}
        <Card className="border-zinc-200/80">
          <CardContent className="p-0">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-medium text-zinc-900">
                Pending assets / tasks
              </h3>
            </div>
            <div className="divide-y divide-zinc-100">
              {assets.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">
                  No pending tasks
                </p>
              ) : (
                assets.slice(0, 8).map((a) => {
                  const overdue = isOverdue(a.dueDate);
                  return (
                    <Link
                      key={a.id}
                      href={`/collaborations/${a.collaborationId}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {a.contentType.replace(/_/g, " ")} ·{" "}
                          {a.platform.replace(/_/g, " ")}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {a.influencer.name}
                          {a.influencer.instagramHandle &&
                            ` · @${a.influencer.instagramHandle}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={statusColors[a.status] || "bg-zinc-100"}>
                          {a.status.replace(/_/g, " ")}
                        </Badge>
                        {a.dueDate && (
                          <span
                            className={`flex items-center gap-1 text-[10px] ${
                              overdue ? "text-red-600" : "text-zinc-400"
                            }`}
                          >
                            {overdue && <AlertCircle className="h-3 w-3" />}
                            <Clock className="h-3 w-3" />
                            {formatDate(a.dueDate)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
              {assets.length > 8 && (
                <Link
                  href="/assets"
                  className="block px-4 py-2 text-center text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  See all {assets.length} →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
