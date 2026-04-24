import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuggestionStatus } from "@/generated/prisma";

const STATUS_VALUES = Object.values(SuggestionStatus) as [
  SuggestionStatus,
  ...SuggestionStatus[],
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope") ?? "mine"; // "mine" | "all"
  const statusParam = searchParams.get("status");
  const status = statusParam && STATUS_VALUES.includes(statusParam as SuggestionStatus)
    ? (statusParam as SuggestionStatus)
    : undefined;

  const where: {
    assignedToUserId?: string;
    status?: SuggestionStatus;
  } = {};

  if (scope === "mine") {
    where.assignedToUserId = session.user.id as string;
  }
  if (status) where.status = status;

  const suggestions = await prisma.influencerSuggestion.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      promotedInfluencer: { select: { id: true, name: true, instagramHandle: true } },
    },
    take: 200,
  });

  return NextResponse.json({ suggestions });
}
