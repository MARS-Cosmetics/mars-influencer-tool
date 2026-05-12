import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { notifyManagers } from "@/lib/notifications";

/**
 * Proposals on a collaboration — one row per negotiation round.
 * Any authenticated user (typically the handler / assignee) can POST.
 * GET returns the full history newest-first.
 */

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;

  const proposals = await prisma.collaborationProposal.findMany({
    where: { collaborationId: id },
    orderBy: { submittedAt: "desc" },
    include: {
      submitter: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ proposals });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  const body = await request.json().catch(() => ({}));

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    select: { id: true, dealLockedAt: true, assignedTo: true },
  });
  if (!collab) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  // Only the assigned handler can submit. No admin override — admins
  // review, they do not submit on someone else's behalf.
  if (collab.assignedTo !== userId) {
    return NextResponse.json(
      { error: "Only the assigned handler of this collaboration can submit proposals" },
      { status: 403 },
    );
  }
  if (collab.dealLockedAt) {
    return NextResponse.json(
      { error: "Deal is already locked — proposals cannot be submitted" },
      { status: 400 },
    );
  }

  // Supersede any older "pending_review" / "counter_offered" rows so the
  // history shows only ONE active proposal at a time.
  await prisma.collaborationProposal.updateMany({
    where: {
      collaborationId: id,
      status: { in: ["pending_review", "counter_offered"] },
    },
    data: { status: "superseded" },
  });

  const proposal = await prisma.collaborationProposal.create({
    data: {
      collaborationId: id,
      submittedBy: userId,
      proposedAmount: body.proposedAmount ? Number(body.proposedAmount) : null,
      proposedGstPct: body.proposedGstPct ? Number(body.proposedGstPct) : null,
      proposedDueDate: body.proposedDueDate ? new Date(body.proposedDueDate) : null,
      proposedTerms: body.proposedTerms || null,
      influencerResponse: body.influencerResponse || null,
      status: "pending_review",
    },
    include: {
      submitter: { select: { id: true, name: true } },
    },
  });

  void logActivity({
    userId,
    entity: "collaboration",
    entityId: id,
    action: "created",
    description: `Proposal submitted for review (₹${proposal.proposedAmount ?? "—"})`,
  });

  // Fan out to all admins + managers. The submitter (handler) doesn't need
  // to be re-notified about their own action. Awaited because fire-and-forget
  // can get killed on serverless before the DB write completes.
  await notifyManagers(
    {
      type: "proposal_submitted",
      title: "New proposal awaiting review",
      body: `${proposal.submitter?.name ?? "Handler"} submitted ₹${
        proposal.proposedAmount ?? "—"
      } for review`,
      actionUrl: `/collaborations/${id}?tab=proposals`,
      entityType: "collaboration",
      entityId: id,
    },
    userId,
  );

  return NextResponse.json(proposal, { status: 201 });
}
