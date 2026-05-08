export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { AssetStatus, Platform } from "@/generated/prisma";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { AssetsTable, type AssetRow } from "./assets-table";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    platform?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "";
  const platformFilter = params.platform || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.influencer = {
      name: { contains: search, mode: "insensitive" },
    };
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (platformFilter) {
    where.platform = platformFilter;
  }

  const rawAssets = await prisma.asset.findMany({
    where,
    include: {
      influencer: { select: { id: true, name: true } },
      collaboration: {
        select: {
          id: true,
          type: true,
          agreedAmount: true,
          payableAmount: true,
          brand: { select: { name: true } },
          _count: { select: { assets: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Compute per-asset amount = collab.payableAmount (gross-of-GST, what we
  // actually pay out) divided across that collab's assets. Falls back to
  // agreedAmount for legacy collabs that don't have payableAmount set yet.
  const assets: AssetRow[] = rawAssets.map((a) => {
    const collab = a.collaboration;
    let perAssetAmount: number | null = null;
    if (collab && collab.type !== "barter") {
      const total = Number(collab.payableAmount ?? collab.agreedAmount ?? 0);
      const count = collab._count.assets || 1;
      if (total > 0) perAssetAmount = total / count;
    }
    return {
      id: a.id,
      platform: a.platform,
      contentType: a.contentType,
      status: a.status,
      views: a.views,
      likes: a.likes,
      comments: a.comments,
      contentRating:
        a.contentRating != null ? Number(a.contentRating) : null,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      contentUrl: a.contentUrl,
      paymentStatus: a.paymentStatus,
      paidAt: a.paidAt ? a.paidAt.toISOString() : null,
      influencer: a.influencer,
      perAssetAmount,
      collaboration: collab
        ? {
            id: collab.id,
            type: collab.type,
            brand: collab.brand,
          }
        : null,
    };
  });

  const statuses = Object.values(AssetStatus);
  const platforms = Object.values(Platform);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <Link href="/assets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            name="search"
            placeholder="Search by influencer name..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <form className="flex items-center gap-2">
          <input type="hidden" name="search" value={search} />
          <select
            name="platform"
            defaultValue={platformFilter}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </div>

      <AssetsTable assets={assets} />
    </div>
  );
}
