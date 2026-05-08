import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { fiscalYearLabel } from "./fiscal-year";
import { computeGstSplit } from "./tax";
import {
  reserveNextPoNumber,
  reserveNextVendorCode,
} from "./numbering";
import { MARS_LEGAL } from "./mars-config";

/**
 * Generate a Purchase Order for a given PR parcel.
 *
 * Idempotent: if a PO already exists for the parcel, returns the existing
 * row. Otherwise reserves a fresh PO number + vendor code (if needed),
 * computes GST split, and writes the PO.
 *
 * Returns null when the parcel is not eligible (no collab, barter, or
 * agreedAmount missing). Caller should treat null as "skip silently" —
 * not every parcel deserves a PO.
 */
export async function generatePoForParcel(
  prParcelId: string,
  generatedBy: string | null,
) {
  const parcel = await prisma.prParcel.findUnique({
    where: { id: prParcelId },
    include: {
      collaboration: true,
      influencer: true,
    },
  });

  if (!parcel) throw new Error("PR parcel not found");
  if (!parcel.collaboration) return null; // gifting-only parcels skip PO
  if (parcel.collaboration.type === "barter") return null;
  const agreedAmount = parcel.collaboration.agreedAmount
    ? Number(parcel.collaboration.agreedAmount)
    : 0;
  if (agreedAmount <= 0) return null;

  // Idempotency check — return existing PO if one was already issued.
  const existing = await prisma.purchaseOrder.findUnique({
    where: { prParcelId },
  });
  if (existing) return existing;

  const taxRatePct = parcel.collaboration.gstPct
    ? Number(parcel.collaboration.gstPct)
    : 18;

  const split = computeGstSplit({
    basePrice: agreedAmount,
    taxRatePct,
    marsGstin: MARS_LEGAL.gstin,
    vendorGstin: parcel.influencer.gstin,
  });

  const today = new Date();
  const fy = fiscalYearLabel(today);

  // Single transaction: reserve PO number + vendor code (if missing) + insert.
  // Serializable enough for our concurrency level; numbering helpers use
  // SELECT FOR UPDATE locks to prevent collisions.
  return prisma.$transaction(async (tx) => {
    const { poNumber, sequence } = await reserveNextPoNumber(tx, fy);

    let vendorCode = parcel.influencer.vendorCode;
    if (!vendorCode) {
      vendorCode = await reserveNextVendorCode(tx);
      await tx.influencer.update({
        where: { id: parcel.influencer.id },
        data: { vendorCode },
      });
    }

    const addressParts = [
      parcel.influencer.addressLine1,
      parcel.influencer.addressLine2,
      parcel.influencer.city,
    ]
      .filter(Boolean)
      .join(", ");

    return tx.purchaseOrder.create({
      data: {
        poNumber,
        fiscalYear: fy,
        sequence,
        prParcelId: parcel.id,
        collaborationId: parcel.collaboration!.id,
        influencerId: parcel.influencer.id,
        brandId: parcel.brandId,
        vendorCodeSnapshot: vendorCode,
        vendorNameSnapshot: parcel.influencer.name,
        vendorPanSnapshot: parcel.influencer.panNumber,
        vendorGstinSnapshot: parcel.influencer.gstin,
        vendorAddressSnapshot: addressParts || null,
        vendorStateSnapshot: parcel.influencer.state,
        vendorPincodeSnapshot: parcel.influencer.pincode,
        vendorPhoneSnapshot: parcel.influencer.phone,
        basePrice: new Prisma.Decimal(agreedAmount),
        taxRate: new Prisma.Decimal(taxRatePct),
        igstAmount: new Prisma.Decimal(split.igstAmount),
        cgstAmount: new Prisma.Decimal(split.cgstAmount),
        sgstAmount: new Prisma.Decimal(split.sgstAmount),
        taxableAmount: new Prisma.Decimal(split.taxableAmount),
        totalTax: new Prisma.Decimal(split.totalTax),
        roundOff: new Prisma.Decimal(0),
        grandTotal: new Prisma.Decimal(split.grandTotal),
        poDate: today,
        generatedBy,
      },
    });
  });
}
