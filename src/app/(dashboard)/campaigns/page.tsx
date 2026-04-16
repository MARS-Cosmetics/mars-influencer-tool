export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { CampaignStatus } from "@/generated/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignFilters } from "./campaign-filters";

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "";
  const brandFilter = typeof params.brand === "string" ? params.brand : "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (status) {
    where.status = status;
  }

  if (brandFilter) {
    where.brandId = brandFilter;
  }

  const [campaigns, brands] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <CampaignFilters
        currentSearch={search}
        currentStatus={status}
        currentBrand={brandFilter}
        brands={brands}
        campaignStatuses={Object.values(CampaignStatus)}
      />

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Budget</TableHead>
              <TableHead>Spent Budget</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>{campaign.brand.name}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(campaign.totalBudget)}</TableCell>
                  <TableCell>{formatCurrency(campaign.spentBudget)}</TableCell>
                  <TableCell>{formatDate(campaign.startDate)}</TableCell>
                  <TableCell>{formatDate(campaign.endDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
