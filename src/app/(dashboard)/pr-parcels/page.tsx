"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, Package, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

type ParcelStatus =
  | "preparing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "returned";

type Parcel = {
  id: string;
  status: ParcelStatus;
  shopifyOrderId: string | null;
  shopifyOrderNumber: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  influencer: { id: string; name: string };
  brand: { id: string; name: string };
};

type ParcelsResponse = {
  items: Parcel[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;
const STATUSES: ParcelStatus[] = [
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "returned",
];

const parcelStatusColors: Record<ParcelStatus, string> = {
  preparing: "bg-gray-100 text-gray-700",
  shipped: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-red-100 text-red-700",
};

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PrParcelsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;

  const url = `/api/pr-parcels?limit=${PAGE_SIZE}&offset=${offset}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${status ? `&status=${encodeURIComponent(status)}` : ""}`;

  const { data, isLoading, error } = useSWR<ParcelsResponse>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const parcels = data?.items ?? [];
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
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-[#A6192E]" />
          <h1 className="text-2xl font-bold">PR Parcels</h1>
        </div>
        <Link href="/pr-parcels/new">
          <Button className="bg-[#A6192E] hover:bg-[#8a1526] text-white">
            <Plus className="mr-1 h-4 w-4" />
            Quick Create
          </Button>
        </Link>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-3"
      >
        <Input
          placeholder="Search by influencer, courier, or tracking..."
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
          className="flex h-9 w-full max-w-[180px] rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(search || status) && (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shopify Order</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Shipped Date</TableHead>
                <TableHead>Delivered Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-red-500 py-8"
                  >
                    Failed to load PR parcels.
                  </TableCell>
                </TableRow>
              ) : isLoading && !data ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : parcels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 py-8"
                  >
                    No PR parcels found.
                  </TableCell>
                </TableRow>
              ) : (
                parcels.map((parcel) => (
                  <TableRow key={parcel.id}>
                    <TableCell>
                      <Link
                        href={`/pr-parcels/${parcel.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {parcel.influencer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{parcel.brand.name}</TableCell>
                    <TableCell>
                      <Badge className={parcelStatusColors[parcel.status]}>
                        {parcel.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {parcel.shopifyOrderNumber ? (
                        <span className="text-sm font-medium text-gray-900">
                          {parcel.shopifyOrderNumber}
                        </span>
                      ) : parcel.shopifyOrderId ? (
                        <span className="text-xs text-gray-500">
                          ID: {parcel.shopifyOrderId}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">--</span>
                      )}
                    </TableCell>
                    <TableCell>{parcel.courierName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {parcel.trackingNumber || "-"}
                    </TableCell>
                    <TableCell>{formatDate(parcel.shippedAt)}</TableCell>
                    <TableCell>{formatDate(parcel.deliveredAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
