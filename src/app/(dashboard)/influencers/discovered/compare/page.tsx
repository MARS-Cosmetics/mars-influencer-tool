export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type SnapshotShape,
} from "../types";

const MAX_COMPARE = 4;

function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sessionUser = session.user as {
    id: string;
    role?: string;
    brandId?: string | null;
  };

  const params = await searchParams;
  const raw = typeof params.ids === "string" ? params.ids : "";
  const ids = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  // Tenancy-scoped WHERE — same policy as /influencers/discovered
  const tenantScope: Prisma.DiscoveryBookmarkWhereInput =
    sessionUser.role === "admin"
      ? {}
      : sessionUser.brandId
        ? { campaign: { brandId: sessionUser.brandId } }
        : { userId: sessionUser.id };

  const bookmarks =
    ids.length > 0
      ? await prisma.discoveryBookmark.findMany({
          where: { AND: [{ id: { in: ids } }, tenantScope] },
          include: {
            campaign: {
              select: { name: true, brand: { select: { name: true } } },
            },
          },
        })
      : [];

  // Preserve the URL's id order (findMany doesn't).
  const byId = new Map(bookmarks.map((b) => [b.id, b]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/influencers/discovered">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Compare creators
          </h1>
          <p className="text-sm text-muted-foreground">
            {ordered.length} of {ids.length} creator
            {ids.length !== 1 ? "s" : ""} side-by-side.
            {ordered.length < ids.length &&
              " Some bookmarks were missing or deleted."}
          </p>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          Nothing to compare. Go back to{" "}
          <Link
            href="/influencers/discovered"
            className="text-primary hover:underline"
          >
            Discovered
          </Link>{" "}
          and select 2–{MAX_COMPARE} creators.
        </div>
      ) : (
        <ComparisonGrid
          rows={ordered.map((b) => ({
            ...b,
            profile: (b.profileSnapshot as SnapshotShape) ?? {},
          }))}
        />
      )}
    </div>
  );
}

// ============================================================
// Grid
// ============================================================

type Row = Awaited<ReturnType<typeof prisma.discoveryBookmark.findMany>>[number] & {
  profile: SnapshotShape;
  campaign: {
    name: string;
    brand: { name: string } | null;
  } | null;
};

function ComparisonGrid({ rows }: { rows: Row[] }) {
  const cols = Math.min(rows.length, MAX_COMPARE);

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <div
        className="grid gap-px bg-border"
        style={{ gridTemplateColumns: `200px repeat(${cols}, minmax(220px, 1fr))` }}
      >
        {/* Header row: each creator's card */}
        <HeaderCell label="" />
        {rows.map((r) => (
          <div key={r.id} className="bg-card p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                {r.profile.picture ? (
                  <AvatarImage src={r.profile.picture} />
                ) : null}
                <AvatarFallback>
                  {r.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate font-semibold">
                    {r.profile.fullname || r.username}
                  </span>
                  {r.profile.isVerified && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                  )}
                </div>
                {r.profile.url ? (
                  <a
                    href={r.profile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
                  >
                    @{r.username}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="truncate text-xs text-muted-foreground">
                    @{r.username}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Metric rows */}
        <LabelCell>Platform</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <Badge variant="outline" className="capitalize">
              {r.platform}
            </Badge>
          </Cell>
        ))}

        <LabelCell>Followers</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <span className="font-semibold tabular-nums">
              {formatCount(r.profile.followers)}
            </span>
          </Cell>
        ))}

        <LabelCell>Engagement rate</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <span className="font-semibold tabular-nums">
              {typeof r.profile.engagementRate === "number"
                ? `${(r.profile.engagementRate * 100).toFixed(2)}%`
                : "-"}
            </span>
          </Cell>
        ))}

        <LabelCell>Engagements</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>{formatCount(r.profile.engagements)}</Cell>
        ))}

        <LabelCell>Verified</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>{r.profile.isVerified ? "Yes" : "No"}</Cell>
        ))}

        <LabelCell>Status</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_COLORS[r.status]}`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </Cell>
        ))}

        <LabelCell>Campaign</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <div className="text-sm">
              <div>{r.campaign?.name ?? "—"}</div>
              {r.campaign?.brand?.name && (
                <div className="text-xs text-muted-foreground">
                  {r.campaign.brand.name}
                </div>
              )}
            </div>
          </Cell>
        ))}

        <LabelCell>Note</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <span className="whitespace-pre-line text-xs text-muted-foreground">
              {r.note || "—"}
            </span>
          </Cell>
        ))}

        <LabelCell>Bookmarked</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <span className="text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </Cell>
        ))}

        <LabelCell>Actions</LabelCell>
        {rows.map((r) => (
          <Cell key={r.id}>
            <Link href={`/influencers/new?bookmarkId=${r.id}`}>
              <Button size="sm" variant="outline">
                Add as Influencer
              </Button>
            </Link>
          </Cell>
        ))}
      </div>
    </div>
  );
}

function HeaderCell({ label }: { label: string }) {
  return <div className="bg-muted/50 p-4 text-sm font-medium">{label}</div>;
}

function LabelCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="bg-card p-3 text-sm">{children}</div>;
}
