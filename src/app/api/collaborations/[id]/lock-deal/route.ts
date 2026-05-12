import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { notifyManagers } from "@/lib/notifications";

/**
 * Handler signals "deal locked" — influencer has agreed final terms.
 *
 * Preconditions: at least one proposal in status `accepted_by_influencer`.
 * Side effects:
 *   - Sets collaboration.dealLockedAt / dealLockedBy
 *   - Copies the accepted proposal's terms into the collab fields
 *     (agreedAmount, gstPct, payableAmount, dueDate) — single source of truth
 *   - Writes an activity log entry with action="status_change". Any UI
 *     listening for that entity/action surfaces it to admin.
 *
 * Deliberately does NOT push the collab status to "confirmed" — that step
 * still has its own state-machine requirements (products linked, address,
 * etc.). Locking is a softer signal: "negotiation done, finalize the rest".
 */
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    select: {
      id: true,
      assignedTo: true,
      dealLockedAt: true,
      proposals: {
        where: { status: "accepted_by_influencer" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          proposedAmount: true,
          proposedGstPct: true,
          proposedDueDate: true,
          counterAmount: true,
          counterGstPct: true,
          counterDueDate: true,
        },
      },
    },
  });

  if (!collab) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (collab.assignedTo !== userId) {
    return NextResponse.json(
      { error: "Only the assigned handler can lock this deal" },
      { status: 403 },
    );
  }
  if (collab.dealLockedAt) {
    return NextResponse.json(
      { error: "Deal already locked" },
      { status: 400 },
    );
  }
  const accepted = collab.proposals[0];
  if (!accepted) {
    return NextResponse.json(
      {
        error:
          "No accepted-by-influencer proposal found. Mark a proposal as accepted first.",
      },
      { status: 400 },
    );
  }

  // Prefer the admin's counter terms if present (they were the last
  // approved/countered terms); fall back to the handler's original proposed
  // values. Mirrors how `Collaboration.payableAmount` is computed elsewhere.
  const amount = accepted.counterAmount ?? accepted.proposedAmount;
  const gstPct = accepted.counterGstPct ?? accepted.proposedGstPct;
  const dueDate = accepted.counterDueDate ?? accepted.proposedDueDate;
  const payable =
    amount != null
      ? Math.round(Number(amount) * (1 + (Number(gstPct ?? 0)) / 100) * 100) /
        100
      : null;

  const updated = await prisma.collaboration.update({
    where: { id },
    data: {
      dealLockedAt: new Date(),
      dealLockedBy: userId,
      agreedAmount: amount ?? undefined,
      gstPct: gstPct ?? undefined,
      payableAmount: payable ?? undefined,
      dueDate: dueDate ?? undefined,
    },
    select: {
      id: true,
      dealLockedAt: true,
      dealLockedBy: true,
      agreedAmount: true,
      gstPct: true,
      payableAmount: true,
      dueDate: true,
    },
  });

  void logActivity({
    userId,
    entity: "collaboration",
    entityId: id,
    action: "status_change",
    field: "deal_locked",
    oldValue: null,
    newValue: "locked",
    description: `Deal locked at ₹${amount ?? "—"} (gst ${gstPct ?? 0}%)`,
  });

  await notifyManagers(
    {
      type: "deal_locked",
      title: "Deal locked",
      body: `Locked at ₹${amount ?? "—"} (gst ${gstPct ?? 0}%)`,
      actionUrl: `/collaborations/${id}?tab=proposals`,
      entityType: "collaboration",
      entityId: id,
    },
    userId,
  );

  return NextResponse.json(updated);
}
