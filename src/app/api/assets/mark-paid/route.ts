import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

/**
 * Bulk-mark assets as paid. Triggered by the /payments/new review page.
 * Replaces nothing on Payment model — this is per-asset payment tracking
 * independent of the existing collab-level payment flow.
 *
 * Real payment-gateway integration plugs in here later: POST will eventually
 * (a) create the gateway transaction, (b) only set paidAt after the gateway
 * confirms. For now it just flips the status.
 */

const BodySchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { assetIds } = parsed.data;

  // Refuse if any asset is already paid — caller's UI shouldn't have let
  // these be selected, so a request here means stale state. Idempotent
  // semantics would silently skip; we return 409 instead so the caller
  // can refresh and show the truth.
  const existing = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, paymentStatus: true },
  });

  const missing = assetIds.filter(
    (id) => !existing.some((e) => e.id === id),
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Some assets not found", missingIds: missing },
      { status: 404 },
    );
  }

  const alreadyPaid = existing.filter((e) => e.paymentStatus === "paid");
  if (alreadyPaid.length > 0) {
    return NextResponse.json(
      {
        error: "Some assets are already paid",
        alreadyPaidIds: alreadyPaid.map((a) => a.id),
      },
      { status: 409 },
    );
  }

  const now = new Date();
  await prisma.asset.updateMany({
    where: { id: { in: assetIds } },
    data: { paymentStatus: "paid", paidAt: now },
  });

  // Audit each asset separately so the per-entity activity log shows it.
  await Promise.all(
    assetIds.map((id) =>
      logActivity({
        userId: user.id ?? null,
        entity: "asset",
        entityId: id,
        action: "updated",
        field: "paymentStatus",
        oldValue: "unpaid",
        newValue: "paid",
        description: "Marked paid via bulk asset payment",
      }),
    ),
  );

  return NextResponse.json({ ok: true, paidCount: assetIds.length, paidAt: now });
}
