export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ParcelStatus } from "@/generated/prisma";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
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

const parcelStatusColors: Record<ParcelStatus, string> = {
  preparing: "bg-gray-100 text-gray-700",
  shipped: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-red-100 text-red-700",
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PrParcelsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search, status } = await searchParams;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { courierName: { contains: search, mode: "insensitive" } },
      { influencer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const parcels = await prisma.prParcel.findMany({
    where,
    include: {
      influencer: true,
      brand: true,
    },
    orderBy: { createdAt: "desc" },
  });

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

      <div className="flex items-center gap-4">
        <form className="flex items-center gap-4 flex-1">
          <Input
            name="search"
            placeholder="Search by influencer, courier, or tracking..."
            defaultValue={search || ""}
            className="max-w-sm"
          />
          <select
            name="status"
            defaultValue={status || ""}
            className="flex h-9 w-full max-w-[180px] rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Statuses</option>
            {Object.values(ParcelStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>

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
              {parcels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
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
    </div>
  );
}
