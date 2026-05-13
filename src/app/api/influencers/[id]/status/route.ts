import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InfluencerStatus } from "@/generated/prisma";

const VALID_STATUSES: ReadonlySet<string> = new Set(Object.values(InfluencerStatus));

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const newStatus = (body as { status?: unknown })?.status;
  if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.influencer.update({
      where: { id },
      data: { status: newStatus as InfluencerStatus },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    // Prisma P2025 = record not found
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }
    console.error("Failed to update influencer status:", e);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
