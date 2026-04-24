import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Prisma,
  SuggestionStatus,
  InfluencerSource,
  InfluencerStatus,
} from "@/generated/prisma";

const ApproveSchema = z.object({
  // Allow overriding / filling details at approval time. All optional because
  // most of the Influencer model is optional.
  name: z.string().min(1).optional(),
  instagramHandle: z.string().min(1).optional(),
  youtubeHandle: z.string().min(1).optional(),
  tiktokHandle: z.string().min(1).optional(),
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
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const suggestion = await prisma.influencerSuggestion.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      platform: true,
      handle: true,
      profileUrl: true,
      submittedByName: true,
      assignedToUserId: true,
    },
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

  // Derive influencer fields from suggestion + optional overrides
  const handle = parsed.data.instagramHandle ?? parsed.data.youtubeHandle ?? parsed.data.tiktokHandle ?? suggestion.handle ?? null;
  const name = parsed.data.name ?? (handle ? `@${handle}` : "Suggested influencer");

  const influencerData: Prisma.InfluencerCreateInput = {
    name,
    status: InfluencerStatus.discovered,
    source: InfluencerSource.inbound,
    internalNotes: [
      suggestion.submittedByName ? `Suggested via Telegram by ${suggestion.submittedByName}` : "Suggested via Telegram",
      parsed.data.note,
    ].filter(Boolean).join("\n"),
  };

  // Map handle to the right platform field
  if (parsed.data.instagramHandle) {
    influencerData.instagramHandle = parsed.data.instagramHandle;
  } else if (parsed.data.youtubeHandle) {
    influencerData.youtubeHandle = parsed.data.youtubeHandle;
  } else if (parsed.data.tiktokHandle) {
    influencerData.tiktokHandle = parsed.data.tiktokHandle;
  } else if (suggestion.handle) {
    if (suggestion.platform === "instagram") influencerData.instagramHandle = suggestion.handle;
    else if (suggestion.platform === "youtube") influencerData.youtubeHandle = suggestion.handle;
    else if (suggestion.platform === "tiktok") influencerData.tiktokHandle = suggestion.handle;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const influencer = await tx.influencer.create({ data: influencerData });

      const updated = await tx.influencerSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: SuggestionStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: reviewerId,
          reviewerNote: parsed.data.note,
          promotedInfluencerId: influencer.id,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "influencer_suggestion",
          entityId: suggestion.id,
          action: "approved",
          description: `Approved suggestion and created influencer ${influencer.name}`,
        },
      });

      return { influencer, suggestion: updated };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes("instagram_handle")) {
        return NextResponse.json(
          { error: "An influencer with this Instagram handle already exists." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "A record with this value already exists." },
        { status: 409 },
      );
    }
    console.error("Failed to approve suggestion:", error);
    return NextResponse.json(
      { error: "Failed to approve suggestion" },
      { status: 500 },
    );
  }
}
