import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

/**
 * Influencer ownership management.
 *
 * DELETE — release the lock. Owner can release their own; admin can release any.
 * PATCH  — reassign to a different user. Admin only.
 */

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const user = session?.user as
    | { id?: string; role?: string }
    | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const inf = await prisma.influencer.findUnique({
    where: { id },
    select: { id: true, name: true, ownerId: true },
  });
  if (!inf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = inf.ownerId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Only the current owner or an admin can release this influencer." },
      { status: 403 },
    );
  }

  await prisma.influencer.update({
    where: { id },
    data: { ownerId: null, ownedAt: null },
  });

  void logActivity({
    userId: user.id,
    action: "updated",
    entity: "influencer",
    entityId: id,
    field: "ownerId",
    oldValue: inf.ownerId,
    newValue: null,
    description: `Released ownership of ${inf.name ?? id}`,
  });

  return NextResponse.json({ ok: true });
}

const PatchSchema = z.object({
  ownerId: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const user = session?.user as
    | { id?: string; role?: string }
    | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can reassign ownership." },
      { status: 403 },
    );
  }

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const [inf, newOwner] = await Promise.all([
    prisma.influencer.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true },
    }),
    prisma.user.findUnique({
      where: { id: parsed.data.ownerId },
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  if (!inf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!newOwner || !newOwner.isActive) {
    return NextResponse.json(
      { error: "Target user does not exist or is inactive." },
      { status: 400 },
    );
  }

  await prisma.influencer.update({
    where: { id },
    data: { ownerId: newOwner.id, ownedAt: new Date() },
  });

  void logActivity({
    userId: user.id,
    action: "updated",
    entity: "influencer",
    entityId: id,
    field: "ownerId",
    oldValue: inf.ownerId,
    newValue: newOwner.id,
    description: `Reassigned ${inf.name ?? id} from ${inf.ownerId ?? "(none)"} to ${newOwner.name}`,
  });

  return NextResponse.json({ ok: true });
}
