"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  totalBudget: number | string | null;
  spentBudget: number | string | null;
  startDate: string | null;
  endDate: string | null;
  brand: { id: string; name: string };
};

type CampaignsResponse = {
  items: Campaign[];
  total: number;
  limit: number;
  offset: number;
};

type Brand = { id: string; name: string };

const PAGE_SIZE = 50;
const STATUSES: CampaignStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
];

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

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CampaignsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [brandId, setBrandId] = useState("");
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;

  const url = `/api/campaigns?limit=${PAGE_SIZE}&offset=${offset}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${status ? `&status=${encodeURIComponent(status)}` : ""}${
    brandId ? `&brandId=${encodeURIComponent(brandId)}` : ""
  }`;

  const { data, isLoading, error } = useSWR<CampaignsResponse>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const { data: brandData } = useSWR<{ brands: Brand[] }>(
    "/api/brands",
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const brands = brandData?.brands ?? [];
  const campaigns = data?.items ?? [];
  const total = data?.total ?? 0;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setBrandId("");
    setPage(1);
  };

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

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-3"
      >
        <Input
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(search || status || brandId) && (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        )}
      </form>

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
            {error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-500 py-8">
                  Failed to load campaigns.
                </TableCell>
              </TableRow>
            ) : isLoading && !data ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-gray-500 py-8"
                >
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isLoading && data && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </>
          )}
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
