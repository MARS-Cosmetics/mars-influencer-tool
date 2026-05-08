"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

export interface ReviewAsset {
  id: string;
  platform: string;
  contentType: string;
  contentUrl: string | null;
  paymentStatus: "unpaid" | "pending" | "paid";
  paidAt: string | null;
  perAssetAmount: number | null;
  currency: string;
  gstPct: number | null;
  influencer: {
    id: string;
    name: string;
    instagramHandle: string | null;
    paymentPreference: string | null;
    upiId: string | null;
    bankAccountNumber: string | null;
    bankIfscCode: string | null;
  };
  collaboration: {
    id: string;
    type: string;
    brand: { name: string } | null;
    campaign: { name: string } | null;
  } | null;
}

interface Props {
  items: ReviewAsset[];
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BulkAssetPaymentReview({ items }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Default selection = every payable item (unpaid + has amount).
  // User can deselect any to pay only a subset.
  const defaultSelected = useMemo(
    () =>
      new Set(
        items
          .filter(
            (i) =>
              i.paymentStatus !== "paid" &&
              i.perAssetAmount != null &&
              i.perAssetAmount > 0,
          )
          .map((i) => i.id),
      ),
    [items],
  );
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ReviewAsset[]>();
    for (const it of items) {
      const list = map.get(it.influencer.id) ?? [];
      list.push(it);
      map.set(it.influencer.id, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const selectedTotal = useMemo(
    () =>
      items
        .filter((i) => selected.has(i.id))
        .reduce((s, i) => s + (i.perAssetAmount ?? 0), 0),
    [items, selected],
  );
  const alreadyPaidCount = items.filter(
    (i) => i.paymentStatus === "paid",
  ).length;
  const selectedCount = selected.size;

  async function confirm() {
    if (selectedCount === 0) {
      toast.error("Select at least one asset to pay.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/assets/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(
        `${data.paidCount ?? selectedCount} asset${selectedCount > 1 ? "s" : ""} marked as paid.`,
      );
      router.push("/payments");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {alreadyPaidCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {alreadyPaidCount} of the selected asset
          {alreadyPaidCount > 1 ? "s are" : " is"} already paid and is shown
          here for reference.
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(([influencerId, group]) => {
          const inf = group[0].influencer;
          const subtotal = group
            .filter((i) => selected.has(i.id))
            .reduce((s, i) => s + (i.perAssetAmount ?? 0), 0);
          const groupSelectableIds = group
            .filter(
              (i) =>
                i.paymentStatus !== "paid" &&
                i.perAssetAmount != null &&
                i.perAssetAmount > 0,
            )
            .map((i) => i.id);
          const allGroupSelected =
            groupSelectableIds.length > 0 &&
            groupSelectableIds.every((id) => selected.has(id));
          const noneGroupSelected = groupSelectableIds.every(
            (id) => !selected.has(id),
          );

          function toggleGroup() {
            setSelected((prev) => {
              const next = new Set(prev);
              if (allGroupSelected) {
                groupSelectableIds.forEach((id) => next.delete(id));
              } else {
                groupSelectableIds.forEach((id) => next.add(id));
              }
              return next;
            });
          }

          return (
            <Card key={influencerId}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {groupSelectableIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              !allGroupSelected && !noneGroupSelected;
                        }}
                        onChange={toggleGroup}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        aria-label={`Toggle all assets for ${inf.name}`}
                      />
                    )}
                    <div>
                      <CardTitle className="text-base">{inf.name}</CardTitle>
                      {inf.instagramHandle && (
                        <p className="text-xs text-muted-foreground">
                          @{inf.instagramHandle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Selected subtotal
                    </div>
                    <div className="font-semibold tabular-nums">
                      ₹{fmt(subtotal)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {group.filter((i) => selected.has(i.id)).length} of{" "}
                      {group.length} selected
                    </div>
                  </div>
                </div>
                {(inf.upiId || inf.bankAccountNumber) && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {inf.paymentPreference && (
                      <span className="capitalize">
                        {inf.paymentPreference.replace(/_/g, " ")}
                      </span>
                    )}
                    {inf.upiId && (
                      <span>
                        {" "}· UPI: <span className="font-mono">{inf.upiId}</span>
                      </span>
                    )}
                    {inf.bankAccountNumber && (
                      <span>
                        {" "}· Bank ••••{inf.bankAccountNumber.slice(-4)}
                        {inf.bankIfscCode && ` · ${inf.bankIfscCode}`}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {group.map((item) => {
                    const isPaid = item.paymentStatus === "paid";
                    const isPayable =
                      !isPaid &&
                      item.perAssetAmount != null &&
                      item.perAssetAmount > 0;
                    const isChecked = selected.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 py-2 ${
                          isPaid ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(item.id)}
                          disabled={!isPayable}
                          title={
                            isPaid
                              ? "Already paid"
                              : !isPayable
                                ? "No amount set"
                                : ""
                          }
                          className="h-4 w-4 rounded border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={`Include ${item.platform} ${item.contentType} in payment`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="font-normal">
                              {item.platform}
                            </Badge>
                            <span className="capitalize text-muted-foreground">
                              {item.contentType.replace(/_/g, " ")}
                            </span>
                            {item.collaboration?.brand?.name && (
                              <span className="text-xs text-muted-foreground">
                                · {item.collaboration.brand.name}
                              </span>
                            )}
                            {item.collaboration?.campaign?.name && (
                              <span className="text-xs text-muted-foreground">
                                · {item.collaboration.campaign.name}
                              </span>
                            )}
                            {isPaid && (
                              <Badge className="bg-green-100 text-green-800">
                                Paid
                              </Badge>
                            )}
                          </div>
                          {item.contentUrl && (
                            <a
                              href={item.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              View content
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-right tabular-nums">
                          {item.perAssetAmount != null ? (
                            <>
                              <div className="font-medium">
                                ₹{fmt(item.perAssetAmount)}
                              </div>
                              {item.gstPct != null && item.gstPct > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  incl. {item.gstPct}% GST
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No amount set
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="text-xs text-muted-foreground">
              Grand total ({selectedCount} selected)
            </div>
            <div className="text-2xl font-bold tabular-nums">
              ₹{fmt(selectedTotal)}
            </div>
          </div>
          <Button
            onClick={confirm}
            disabled={submitting || selectedCount === 0}
            className="bg-[#A6192E] hover:bg-[#8a1526] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Payment ({selectedCount})
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
