// export const dynamic = "force-dynamic";
export const revalidate = 60;
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InfluencerTier, InfluencerStatus, Prisma } from "@/generated/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { InfluencerFilters } from "./influencer-filters";
import { InfluencerTabs } from "./influencer-tabs";

function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

const tierColors: Record<string, string> = {
  nano: "bg-gray-100 text-gray-700",
  micro: "bg-blue-100 text-blue-700",
  mid: "bg-green-100 text-green-700",
  macro: "bg-purple-100 text-purple-700",
  mega: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  discovered: "bg-gray-100 text-gray-700",
  contacted: "bg-yellow-100 text-yellow-700",
  form_submitted: "bg-orange-100 text-orange-700",
  demographics_verified: "bg-cyan-100 text-cyan-700",
  onboarded: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-200 text-gray-500",
  blacklisted: "bg-red-100 text-red-700",
  do_not_contact: "bg-red-200 text-red-800",
};

export default async function InfluencersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const tier = typeof params.tier === "string" ? params.tier : "";
  const status = typeof params.status === "string" ? params.status : "";
  const state = typeof params.state === "string" ? params.state : "";
  const city = typeof params.city === "string" ? params.city : "";

  const where: Prisma.InfluencerWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { instagramHandle: { contains: search, mode: "insensitive" } },
    ];
  }

  if (tier) {
    where.tier = tier as InfluencerTier;
  }

  if (status) {
    where.status = status as InfluencerStatus;
  }

  if (state) {
    where.state = { contains: state, mode: "insensitive" };
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  // Scope discovery bookmark count the same way the Discovered page does,
  // so the tab counter matches what the user can actually see.
  const session = await auth();
  const sessionUser = session?.user as
    | { id: string; role?: string; brandId?: string | null }
    | undefined;
  const bookmarkWhere: Prisma.DiscoveryBookmarkWhereInput =
    !sessionUser
      ? { id: "__none__" } // logged-out: count 0
      : sessionUser.role === "admin"
        ? {}
        : sessionUser.brandId
          ? { campaign: { brandId: sessionUser.brandId } }
          : { userId: sessionUser.id };

  const [influencers, total, discoveredCount] = await Promise.all([
    prisma.influencer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        instagramHandle: true,
        tier: true,
        igFollowerCount: true,
        igEngagementRate: true,
        socialScore: true,
        status: true,
        city: true,
      },
    }),
    prisma.influencer.count({ where }),
    prisma.discoveryBookmark.count({ where: bookmarkWhere }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Influencers</h1>
          <p className="text-sm text-muted-foreground">
            {total} influencer{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link href="/influencers/new">
          <Button>
            <Plus className="size-4" />
            Add Influencer
          </Button>
        </Link>
      </div>

      <InfluencerTabs discoveredCount={discoveredCount} />

      <InfluencerFilters
        currentSearch={search}
        currentTier={tier}
        currentStatus={status}
        currentState={state}
        currentCity={city}
      />

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Followers</TableHead>
              <TableHead className="text-right">Eng. Rate</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>City</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {influencers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No influencers found.
                </TableCell>
              </TableRow>
            ) : (
              influencers.map((influencer) => (
                <TableRow key={influencer.id}>
                  <TableCell>
                    <Link
                      href={`/influencers/${influencer.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {influencer.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {influencer.instagramHandle ? (
                      <a
                        href={`https://instagram.com/${influencer.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#A6192E] hover:underline"
                      >
                        @{influencer.instagramHandle}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {influencer.tier ? (
                      <Badge
                        className={tierColors[influencer.tier] || ""}
                        variant="secondary"
                      >
                        {influencer.tier}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCount(influencer.igFollowerCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {influencer.igEngagementRate != null
                      ? `${Number(influencer.igEngagementRate).toFixed(2)}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {influencer.socialScore != null
                      ? Number(influencer.socialScore).toFixed(1)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[influencer.status] || ""}
                      variant="secondary"
                    >
                      {influencer.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {influencer.city || "-"}
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
