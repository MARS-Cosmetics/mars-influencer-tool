import { Prisma } from "@/generated/prisma";
import type { PrismaClient } from "@/generated/prisma";

/**
 * Atomically reserve the next PO sequence number for a fiscal year.
 *
 * Implementation: SELECT max(sequence) WHERE fiscal_year = ? FOR UPDATE,
 * then return next. Caller must use this inside a transaction (we accept the
 * tx client as a parameter) so the read-and-increment is serialized.
 *
 * Format: PO/{FY}/{seq:7}, e.g. PO/26-27/0000113.
 *
 * Concurrent inserts on the same FY are rare in practice (parcel creation
 * is a low-frequency action), but the transactional pattern keeps it correct
 * if two ops save at the same moment.
 */
export async function reserveNextPoNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  fiscalYear: string,
): Promise<{ poNumber: string; sequence: number }> {
  // Lock all rows for this FY until tx commits, so a concurrent caller has
  // to wait. Without the lock, two parallel `max+1` reads return the same
  // seq and one INSERT will fail on the unique index.
  await tx.$queryRaw`
    SELECT 1 FROM purchase_orders
    WHERE fiscal_year = ${fiscalYear}
    FOR UPDATE
  `;

  const last = await tx.purchaseOrder.findFirst({
    where: { fiscalYear },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  const sequence = (last?.sequence ?? 0) + 1;
  const poNumber = `PO/${fiscalYear}/${String(sequence).padStart(7, "0")}`;
  return { poNumber, sequence };
}

/**
 * Reserve the next vendor code for an influencer that doesn't have one yet.
 *
 * Format: VEN-NNNNN. Atomic via SELECT FOR UPDATE on existing codes.
 */
export async function reserveNextVendorCode(
  tx: Prisma.TransactionClient | PrismaClient,
): Promise<string> {
  await tx.$queryRaw`
    SELECT 1 FROM influencers
    WHERE vendor_code IS NOT NULL
    FOR UPDATE
  `;

  // Find max numeric suffix from existing codes. Codes that don't match the
  // VEN-NNNNN pattern are ignored (data-import accidents shouldn't break us).
  const rows = await tx.influencer.findMany({
    where: { vendorCode: { not: null } },
    select: { vendorCode: true },
  });
  let maxN = 0;
  for (const r of rows) {
    const m = r.vendorCode?.match(/^VEN-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const next = maxN + 1;
  return `VEN-${String(next).padStart(5, "0")}`;
}
