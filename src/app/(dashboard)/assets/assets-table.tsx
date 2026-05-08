"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ExternalLink, IndianRupee, CheckCircle2 } from "lucide-react";

export interface AssetRow {
  id: string;
  platform: string;
  contentType: string;
  status: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  contentRating: number | null;
  publishedAt: string | null;
  contentUrl: string | null;
  paymentStatus: "unpaid" | "pending" | "paid";
  paidAt: string | null;
  influencer: { id: string; name: string };
  /** Computed server-side: collab.payableAmount ÷ assets.count for that collab. */
  perAssetAmount: number | null;
  collaboration: {
    id: string;
    type: string;
    brand: { name: string } | null;
  } | null;
}

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

interface Props {
  assets: AssetRow[];
}

export function AssetsTable({ assets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only unpaid, non-barter assets with a known amount can be selected.
  // Barter has no money component — explicitly excluded so the checkbox is
  // disabled and the row is clearly labeled.
  const selectable = useMemo(
    () =>
      new Set(
        assets
          .filter(
            (a) =>
              a.paymentStatus !== "paid" &&
              a.collaboration?.type !== "barter" &&
              a.perAssetAmount != null &&
              a.perAssetAmount > 0,
          )
          .map((a) => a.id),
      ),
    [assets],
  );

  const allSelectableSelected =
    selectable.size > 0 &&
    Array.from(selectable).every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelectableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable));
    }
  }

  const selectedAssets = useMemo(
    () => assets.filter((a) => selected.has(a.id)),
    [assets, selected],
  );
  const selectedTotal = selectedAssets.reduce(
    (sum, a) => sum + (a.perAssetAmount ?? 0),
    0,
  );

  function makePayment() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(",");
    router.push(`/payments/assets?ids=${encodeURIComponent(ids)}`);
  }

  return (
    <>
      {/* Bulk action bar — only when at least one selectable asset is checked */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between rounded-lg border bg-blue-50 px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-blue-900">
              {selected.size} asset{selected.size > 1 ? "s" : ""} selected
            </span>
            <span className="text-blue-700">
              Total: ₹
              {selectedTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button size="sm" onClick={makePayment}>
              <IndianRupee className="mr-1 h-4 w-4" />
              Make Payment
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelectableSelected}
                  onChange={toggleAll}
                  disabled={selectable.size === 0}
                  className="h-4 w-4 rounded border-gray-300"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Influencer</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Content Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-gray-500 py-8"
                >
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => {
                const isPaid = asset.paymentStatus === "paid";
                const isPending = asset.paymentStatus === "pending";
                const isBarter = asset.collaboration?.type === "barter";
                const isSelectable = selectable.has(asset.id);
                return (
                  <TableRow
                    key={asset.id}
                    className={`hover:bg-gray-50 ${isPaid ? "opacity-50" : ""}`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(asset.id)}
                        onChange={() => toggle(asset.id)}
                        disabled={!isSelectable}
                        title={
                          isPaid
                            ? "Already paid"
                            : isBarter
                              ? "Barter collaboration — no payment to process"
                              : asset.perAssetAmount == null
                                ? "No amount set on collaboration"
                                : ""
                        }
                        className="h-4 w-4 rounded border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`Select ${asset.influencer.name} asset`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="hover:underline"
                      >
                        {asset.influencer.name}
                      </Link>
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
                    <TableCell className="text-right tabular-nums">
                      {asset.collaboration?.type === "barter" ? (
                        <Badge className="bg-purple-100 text-purple-700">
                          Barter
                        </Badge>
                      ) : asset.perAssetAmount != null ? (
                        `₹${asset.perAssetAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
                      {asset.contentRating != null ? (
                        <span className="text-yellow-500 tracking-tight">
                          {Array.from({ length: 5 }, (_, i) =>
                            i < Number(asset.contentRating) ? "★" : "",
                          ).join("")}
                        </span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.publishedAt
                        ? new Date(asset.publishedAt).toLocaleDateString(
                            "en-IN",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Paid
                        </Badge>
                      ) : isBarter ? (
                        <Badge className="bg-purple-100 text-purple-700">
                          Barter
                        </Badge>
                      ) : isPending ? (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">
                          Unpaid
                        </Badge>
                      )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
