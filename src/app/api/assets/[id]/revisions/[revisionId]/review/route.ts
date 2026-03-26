import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST - Review a revision (approve / request changes / reject)
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; revisionId: string }> }
) {
  const { id, revisionId } = await props.params;
  const body = await req.json();

  const { status, feedback } = body; // status: "approved" | "revision_requested" | "rejected"

  if (!["approved", "revision_requested", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }

  const revision = await prisma.assetRevision.update({
    where: { id: revisionId },
    data: {
      status,
      feedback: feedback || null,
      reviewedAt: new Date(),
    },
  });

  // Update asset status based on review
  const assetStatusMap: Record<string, string> = {
    approved: "approved",
    revision_requested: "revision_requested",
    rejected: "rejected",
  };

  await prisma.asset.update({
    where: { id },
    data: { status: assetStatusMap[status] as any },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      entityType: "asset",
      entityId: id,
      action: "revision_reviewed",
      description: `Content revision reviewed: ${status}`,
      changes: { revisionId, status, feedback },
    },
  }).catch(() => {});

  return NextResponse.json(revision);
}
