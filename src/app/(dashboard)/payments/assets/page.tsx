export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  BulkAssetPaymentReview,
  type ReviewAsset,
} from "./bulk-asset-payment-form";

interface SearchParams {
  ids?: string;
}

export default async function BulkAssetPaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { ids } = await searchParams;
  const assetIds = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (assetIds.length === 0) {
    notFound();
  }

  const rawAssets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    include: {
      influencer: {
        select: {
          id: true,
          name: true,
          instagramHandle: true,
          paymentPreference: true,
          upiId: true,
          bankAccountNumber: true,
          bankIfscCode: true,
        },
      },
      collaboration: {
        select: {
          id: true,
          type: true,
          agreedAmount: true,
          payableAmount: true,
          gstPct: true,
          currency: true,
          brand: { select: { name: true } },
          campaign: { select: { name: true } },
          _count: { select: { assets: true } },
        },
      },
    },
  });

  // Compute per-asset amount = collab.payableAmount ÷ assets.count.
  // Barter assets get null amount and won't be selectable downstream.
  const items: ReviewAsset[] = rawAssets.map((a) => {
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
      contentUrl: a.contentUrl,
      paymentStatus: a.paymentStatus,
      paidAt: a.paidAt ? a.paidAt.toISOString() : null,
      perAssetAmount,
      currency: collab?.currency ?? "INR",
      gstPct: collab?.gstPct != null ? Number(collab.gstPct) : null,
      influencer: {
        id: a.influencer.id,
        name: a.influencer.name,
        instagramHandle: a.influencer.instagramHandle,
        paymentPreference: a.influencer.paymentPreference,
        upiId: a.influencer.upiId,
        bankAccountNumber: a.influencer.bankAccountNumber,
        bankIfscCode: a.influencer.bankIfscCode,
      },
      collaboration: collab
        ? {
            id: collab.id,
            type: collab.type,
            brand: collab.brand,
            campaign: collab.campaign,
          }
        : null,
    };
  });

  // Refuse barter-only or no-amount-only batches up front so we don't render
  // a review with a Confirm button that's permanently disabled.
  const hasPayable = items.some(
    (i) =>
      i.paymentStatus !== "paid" &&
      i.perAssetAmount != null &&
      i.perAssetAmount > 0,
  );

  const influencerCount = new Set(items.map((i) => i.influencer.id)).size;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bulk Asset Payment
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} asset{items.length > 1 ? "s" : ""} across{" "}
            {influencerCount} influencer{influencerCount > 1 ? "s" : ""}.
            Uncheck any asset you don&apos;t want to pay.
          </p>
        </div>
      </div>

      {!hasPayable && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          None of the selected assets are payable (barter, no amount set, or
          already paid). Go back and pick different assets.
        </div>
      )}

      <BulkAssetPaymentReview items={items} />
    </div>
  );
}
