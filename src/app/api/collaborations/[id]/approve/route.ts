import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { userId, action, notes } = body; // action: "approve" | "reject"

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    // Verify the user has authority to approve
    const approver = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, approvalLimit: true },
    });

    if (!approver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const collaboration = await prisma.collaboration.findUnique({
      where: { id },
      select: { agreedAmount: true, approvalStatus: true, assignedTo: true },
    });

    if (!collaboration) {
      return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
    }

    if (collaboration.approvalStatus !== "pending_approval") {
      return NextResponse.json(
        { error: "Collaboration is not pending approval" },
        { status: 400 }
      );
    }

    // Check if approver has sufficient limit or is admin
    const amount = collaboration.agreedAmount ? Number(collaboration.agreedAmount) : 0;
    const approverLimit = approver.approvalLimit ? Number(approver.approvalLimit) : 0;
    const canApprove = approver.role === "admin" || (approverLimit > 0 && amount <= approverLimit);

    if (action === "approve" && !canApprove) {
      // Escalate to approver's manager
      const approverWithManager = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true, manager: { select: { name: true } } },
      });

      return NextResponse.json({
        error: "Insufficient approval limit",
        escalationRequired: true,
        nextApproverId: approverWithManager?.managerId,
        nextApproverName: approverWithManager?.manager?.name,
        message: `Amount ₹${amount.toLocaleString("en-IN")} exceeds your approval limit of ₹${approverLimit.toLocaleString("en-IN")}. Escalating to ${approverWithManager?.manager?.name || "admin"}.`,
      }, { status: 403 });
    }

    const updated = await prisma.collaboration.update({
      where: { id },
      data: {
        approvalStatus: action === "approve" ? "approved" : "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
        approvalNotes: notes || null,
        // If approved, move status to confirmed
        ...(action === "approve" ? { status: "confirmed" } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval failed:", error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
