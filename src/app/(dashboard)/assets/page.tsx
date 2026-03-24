export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { AssetStatus, Platform } from "@/generated/prisma";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, ExternalLink } from "lucide-react";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN").format(value);
}

function platformBadgeClass(platform: string) {
  const map: Record<string, string> = {
    instagram: "bg-pink-100 text-pink-800",
    youtube: "bg-red-100 text-red-800",
    twitter: "bg-sky-100 text-sky-800",
    linkedin: "bg-blue-100 text-blue-800",
    blog: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  };
  return map[platform] || "bg-gray-100 text-gray-800";
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    revision_requested: "bg-orange-100 text-orange-800",
    published: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

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

  const assets = await prisma.asset.findMany({
    where,
    include: {
      influencer: { select: { id: true, name: true } },
      collaboration: {
        select: {
          id: true,
          type: true,
          brand: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
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

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Influencer</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Content Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">
                    {asset.influencer.name}
                  </TableCell>
                  <TableCell>
                    <Badge className={platformBadgeClass(asset.platform)}>
                      {asset.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {asset.contentType.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(asset.status)}>
                      {asset.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(asset.views)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(asset.likes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(asset.comments)}
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.contentRating != null
                      ? Number(asset.contentRating).toFixed(1)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {asset.publishedAt
                      ? new Date(asset.publishedAt).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {asset.contentUrl ? (
                      <a
                        href={asset.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
