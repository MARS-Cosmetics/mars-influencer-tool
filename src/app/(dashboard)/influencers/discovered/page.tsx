export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InfluencerTabs } from "../influencer-tabs";
import { DiscoveredTable } from "./discovered-table";
import type { BookmarkRow, SnapshotShape } from "./types";

export default async function DiscoveredInfluencersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Tenancy scoping:
  //   - admins see everything
  //   - branded users see bookmarks on THEIR brand's campaigns
  //   - users without a brand fall back to their own bookmarks only
  const sessionUser = session.user as {
    id: string;
    role?: string;
    brandId?: string | null;
  };
  const where: Prisma.DiscoveryBookmarkWhereInput = (() => {
    if (sessionUser.role === "admin") return {};
    if (sessionUser.brandId) {
      return { campaign: { brandId: sessionUser.brandId } };
    }
    return { userId: sessionUser.id };
  })();

  const [bookmarks, discoveredCount] = await Promise.all([
    prisma.discoveryBookmark.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
    }),
    prisma.discoveryBookmark.count({ where }),
  ]);

  // Serialize dates to ISO strings so the client component gets plain JSON.
  const rows: BookmarkRow[] = bookmarks.map((b) => ({
    id: b.id,
    username: b.username,
    platform: b.platform,
    status: b.status,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
    profileSnapshot: (b.profileSnapshot as SnapshotShape) ?? {},
    campaign: b.campaign
      ? {
          name: b.campaign.name,
          brand: b.campaign.brand
            ? { name: b.campaign.brand.name }
            : null,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Influencers</h1>
        <p className="text-sm text-muted-foreground">
          {discoveredCount} creator{discoveredCount !== 1 ? "s" : ""} bookmarked
          from discovery searches
        </p>
      </div>

      <InfluencerTabs discoveredCount={discoveredCount} />

      <DiscoveredTable bookmarks={rows} />
    </div>
  );
}
