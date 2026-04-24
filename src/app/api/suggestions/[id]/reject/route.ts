import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuggestionStatus } from "@/generated/prisma";

const RejectSchema = z.object({
  note: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reviewerId = session.user.id as string;

  const { id } = await props.params;
  const body = await request.json().catch(() => ({}));
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const suggestion = await prisma.influencerSuggestion.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== SuggestionStatus.pending) {
    return NextResponse.json(
      { error: "Suggestion already reviewed" },
      { status: 409 },
    );
  }

  const updated = await prisma.influencerSuggestion.update({
    where: { id },
    data: {
      status: SuggestionStatus.rejected,
      reviewedAt: new Date(),
      reviewedByUserId: reviewerId,
      reviewerNote: parsed.data.note,
    },
  });

  await prisma.activityLog.create({
    data: {
      entityType: "influencer_suggestion",
      entityId: id,
      action: "rejected",
      description: parsed.data.note
        ? `Rejected suggestion: ${parsed.data.note}`
        : "Rejected suggestion",
    },
  });

  return NextResponse.json({ suggestion: updated });
}
