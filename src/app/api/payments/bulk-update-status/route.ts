import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import type { PaymentStatus } from "@/generated/prisma";

// Finance flow uses only these 4 user-facing statuses (matches the UI
// dropdown + the Excel export labels). The Prisma enum still has
// processing/failed/cancelled for historical rows, but we don't let
// anyone transition INTO those states via this endpoint.
const ALLOWED_STATUSES: PaymentStatus[] = [
  "pending",         // Pending Approval
  "approved",        // Approved for Payment
  "invoice_issue",   // Invoice Issue
  "paid",            // Payment Completed
];

/**
 * Bulk-flips Payment.status for a list of payment IDs. Also flips the
 * Asset.paymentStatus for any assets belonging to those collabs so the
 * influencer page / assets list shows the right state.
 *
 * Body: { paymentIds: string[]; status: PaymentStatus }
 *
 * Restricted to admin / manager — bank-touching action, audit-logged.
 */
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json(
      { error: "Only admins/managers can change payment status" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    paymentIds?: string[];
    status?: PaymentStatus;
  };
  const paymentIds = Array.isArray(body.paymentIds) ? body.paymentIds : [];
  const status = body.status;

  if (paymentIds.length === 0) {
    return NextResponse.json(
      { error: "paymentIds array is required" },
      { status: 400 },
    );
  }
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Update payment rows. Pull collab IDs so we can cascade to Asset.
  const payments = await prisma.payment.findMany({
    where: { id: { in: paymentIds } },
    select: { id: true, collaborationId: true, status: true },
  });

  const collabIds = Array.from(new Set(payments.map((p) => p.collaborationId)));

  await prisma.payment.updateMany({
    where: { id: { in: paymentIds } },
    data: {
      status,
      ...(status === "paid" ? { paidAt: new Date() } : {}),
    },
  });

  // Mirror to Asset.paymentStatus for the asset list views. Asset-level
  // enum only has unpaid/pending/paid, so we collapse the 4 payment
  // statuses: paid → paid, everything else (pending/approved/invoice_issue) → pending.
  if (collabIds.length > 0) {
    const assetStatus = status === "paid" ? "paid" : "pending";
    await prisma.asset.updateMany({
      where: { collaborationId: { in: collabIds } },
      data: { paymentStatus: assetStatus },
    });
  }

  // Audit log per payment so it's traceable per influencer / collab.
  for (const p of payments) {
    void logActivity({
      userId: user.id,
      entity: "payment",
      entityId: p.id,
      action: "status_change",
      field: "status",
      oldValue: p.status,
      newValue: status,
      description: `Payment status: ${p.status} → ${status}`,
    });
  }

  return NextResponse.json({ updated: payments.length, status });
}
