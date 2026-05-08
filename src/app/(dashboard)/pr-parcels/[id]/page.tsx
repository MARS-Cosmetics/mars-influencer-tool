export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ParcelStatus } from "@/generated/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Truck, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

const statusOrder: ParcelStatus[] = [
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
];

export default async function PrParcelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const parcel = await prisma.prParcel.findUnique({
    where: { id },
    include: {
      influencer: true,
      brand: true,
      collaboration: true,
      items: {
        include: { product: true },
      },
      purchaseOrder: true,
    },
  });

  if (!parcel) {
    notFound();
  }

  const currentStatusIndex = statusOrder.indexOf(parcel.status);
  const isReturned = parcel.status === "returned";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pr-parcels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            PR Parcel for {parcel.influencer.name}
          </h1>
          <p className="text-sm text-gray-500">{parcel.brand.name}</p>
        </div>
        <Badge className={parcelStatusColors[parcel.status]}>
          {parcel.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Shipping Info
            </CardTitle>
            <Truck className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Courier</p>
              <p className="text-sm font-medium">{parcel.courierName || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tracking Number</p>
              <p className="text-sm font-mono font-medium">
                {parcel.trackingNumber || "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Address
            </CardTitle>
            <MapPin className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {(() => {
                // Prefer the per-parcel override if someone set one. Most
                // parcels don't have it because the create form doesn't ask
                // for it — fall back to the influencer's stored address.
                if (parcel.shippingAddress) return parcel.shippingAddress;
                const inf = parcel.influencer;
                const lines = [
                  inf.name,
                  inf.addressLine1,
                  inf.addressLine2,
                  [inf.city, inf.state, inf.pincode].filter(Boolean).join(", "),
                  inf.country,
                  inf.phone ? `Phone: ${inf.phone}` : null,
                ].filter(Boolean);
                return lines.length > 0 ? lines.join("\n") : "No address provided";
              })()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Timeline
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm">{formatDateTime(parcel.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Shipped</p>
              <p className="text-sm">{formatDateTime(parcel.shippedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivered</p>
              <p className="text-sm">{formatDateTime(parcel.deliveredAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isReturned ? (
            <div className="flex items-center justify-center py-4">
              <Badge className="bg-red-100 text-red-700 text-base px-4 py-2">
                Parcel Returned
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {statusOrder.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted
                            ? isCurrent
                              ? "bg-blue-500 text-white"
                              : "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <p
                        className={`mt-1 text-xs capitalize ${
                          isCompleted
                            ? "font-medium text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {step.replace("_", " ")}
                      </p>
                    </div>
                    {index < statusOrder.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          index < currentStatusIndex
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {parcel.collaboration && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="text-gray-500">Type:</span>{" "}
              {parcel.collaboration.type.replace("_", " ")}
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Status:</span>{" "}
              {parcel.collaboration.status.replace("_", " ")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Items ({parcel.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {parcel.items.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No items in this parcel.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcel.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.product.sku || "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(item.product.mrp)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order — only renders when one was generated for this parcel
          (paid collab + agreedAmount > 0). Barter-only or gifting-only parcels
          don't have a PO and this card stays hidden. */}
      {parcel.purchaseOrder && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <CardTitle>Purchase Order</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/purchase-orders/${parcel.purchaseOrder.id}/html`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  Preview
                </Button>
              </a>
              <a
                href={`/api/purchase-orders/${parcel.purchaseOrder.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm">
                  <Download className="mr-1 h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">PO Number</p>
                <p className="text-sm font-mono font-medium">
                  {parcel.purchaseOrder.poNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PO Date</p>
                <p className="text-sm">
                  {new Date(parcel.purchaseOrder.poDate).toLocaleDateString(
                    "en-IN",
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor Code</p>
                <p className="text-sm font-mono">
                  {parcel.purchaseOrder.vendorCodeSnapshot}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="text-sm">
                  {parcel.purchaseOrder.vendorNameSnapshot}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Base Price</p>
                <p className="text-sm tabular-nums">
                  ₹
                  {Number(parcel.purchaseOrder.basePrice).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tax</p>
                <p className="text-sm tabular-nums">
                  {Number(parcel.purchaseOrder.igstAmount) > 0 ? (
                    <>
                      IGST @ {Number(parcel.purchaseOrder.taxRate)}% — ₹
                      {Number(parcel.purchaseOrder.igstAmount).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </>
                  ) : (
                    <>
                      CGST + SGST — ₹
                      {(
                        Number(parcel.purchaseOrder.cgstAmount) +
                        Number(parcel.purchaseOrder.sgstAmount)
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="sm:col-span-2 border-t pt-2">
                <p className="text-xs text-gray-500">Grand Total</p>
                <p className="text-lg font-bold tabular-nums">
                  ₹
                  {Number(parcel.purchaseOrder.grandTotal).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
