import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { notifyUser, notifyManagers } from "@/lib/notifications";

/**
 * Admin / manager reviews a proposal:
 *   PUT body { action: "approve" | "reject" | "counter", counterAmount?,
 *              counterGstPct?, counterDueDate?, reviewNotes? }
 *
 * - approve  → status=approved (handler can now take terms to influencer)
 * - reject   → status=rejected (handler must submit a new one)
 * - counter  → status=counter_offered + admin's counterAmount/notes stored;
 *              handler responds with a new proposal that supersedes this.
 *
 * Only role=admin or role=manager may call. Plain users get 403.
 *
 * Handler reports influencer's agreement:
 *   PATCH body { action: "accepted_by_influencer", influencerResponse? }
 *   — moves an APPROVED proposal forward. Doesn't lock the deal yet; the
 *     separate /lock-deal endpoint does that and pings the admin.
 */

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; proposalId: string }> },
) {
  const session = await auth();
  const reviewerId = (session?.user as { id?: string } | undefined)?.id;
  if (!reviewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    select: { role: true },
  });
  if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "manager")) {
    return NextResponse.json(
      { error: "Only managers and admins can review proposals" },
      { status: 403 },
    );
  }

  const { id, proposalId } = await props.params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as "approve" | "reject" | "counter" | undefined;
  if (!action || !["approve", "reject", "counter"].includes(action)) {
    return NextResponse.json(
      { error: "action must be approve | reject | counter" },
      { status: 400 },
    );
  }

  const proposal = await prisma.collaborationProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      collaborationId: true,
      status: true,
      proposedAmount: true,
      submittedBy: true,
    },
  });
  if (!proposal || proposal.collaborationId !== id) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "pending_review") {
    return NextResponse.json(
      {
        error: `Proposal is in status "${proposal.status}" and can no longer be reviewed`,
      },
      { status: 400 },
    );
  }
  // Block self-approval: even if a user is admin AND happens to be the
  // submitter of this proposal, they cannot review their own submission.
  if (proposal.submittedBy === reviewerId) {
    return NextResponse.json(
      { error: "You cannot review your own proposal" },
      { status: 403 },
    );
  }

  const newStatus =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "counter_offered";

  const updated = await prisma.collaborationProposal.update({
    where: { id: proposalId },
    data: {
      status: newStatus,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      counterAmount:
        action === "counter" && body.counterAmount
          ? Number(body.counterAmount)
          : null,
      counterGstPct:
        action === "counter" && body.counterGstPct
          ? Number(body.counterGstPct)
          : null,
      counterDueDate:
        action === "counter" && body.counterDueDate
          ? new Date(body.counterDueDate)
          : null,
      reviewNotes: body.reviewNotes || null,
    },
    include: {
      submitter: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  void logActivity({
    userId: reviewerId,
    entity: "collaboration",
    entityId: id,
    action: action === "approve" ? "approved" : action === "reject" ? "rejected" : "updated",
    field: "proposal",
    description:
      action === "approve"
        ? `Proposal approved (₹${proposal.proposedAmount ?? "—"})`
        : action === "reject"
          ? `Proposal rejected`
          : `Counter-offer sent (₹${body.counterAmount ?? "—"})`,
  });

  // Tell the submitter what happened to their proposal.
  await notifyUser({
    recipientId: proposal.submittedBy,
    type:
      action === "approve"
        ? "proposal_approved"
        : action === "reject"
          ? "proposal_rejected"
          : "proposal_counter_offered",
    title:
      action === "approve"
        ? "Your proposal was approved"
        : action === "reject"
          ? "Your proposal was rejected"
          : "Manager sent a counter-offer",
    body:
      action === "counter"
        ? `Counter: ₹${body.counterAmount ?? "—"}. ${body.reviewNotes ?? ""}`.trim()
        : body.reviewNotes || null,
    actionUrl: `/collaborations/${id}?tab=proposals`,
    entityType: "collaboration",
    entityId: id,
  });

  return NextResponse.json(updated);
}

// Handler updates with influencer's response after taking an approved or
// counter-offered proposal back to the influencer.
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; proposalId: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, proposalId } = await props.params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as "accepted_by_influencer" | undefined;
  if (action !== "accepted_by_influencer") {
    return NextResponse.json(
      { error: "action must be accepted_by_influencer" },
      { status: 400 },
    );
  }

  const proposal = await prisma.collaborationProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      collaborationId: true,
      status: true,
      collaboration: { select: { assignedTo: true } },
    },
  });
  if (!proposal || proposal.collaborationId !== id) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.collaboration.assignedTo !== userId) {
    return NextResponse.json(
      {
        error:
          "Only the assigned handler can mark a proposal as accepted by the influencer",
      },
      { status: 403 },
    );
  }
  if (proposal.status !== "approved" && proposal.status !== "counter_offered") {
    return NextResponse.json(
      {
        error: `Cannot mark influencer-accepted on a proposal in status "${proposal.status}"`,
      },
      { status: 400 },
    );
  }

  const updated = await prisma.collaborationProposal.update({
    where: { id: proposalId },
    data: {
      status: "accepted_by_influencer",
      influencerResponse: body.influencerResponse || null,
    },
  });

  void logActivity({
    userId,
    entity: "collaboration",
    entityId: id,
    action: "updated",
    field: "proposal",
    description: "Influencer accepted the proposal — ready to lock deal",
  });

  await notifyManagers(
    {
      type: "proposal_accepted_by_influencer",
      title: "Influencer accepted — ready to lock",
      body: body.influencerResponse || null,
      actionUrl: `/collaborations/${id}?tab=proposals`,
      entityType: "collaboration",
      entityId: id,
    },
    userId,
  );

  return NextResponse.json(updated);
}
