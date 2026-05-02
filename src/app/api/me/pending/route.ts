import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Active collabs assigned to me (not completed, not cancelled)
  const collabs = await prisma.collaboration.findMany({
    where: {
      assignedTo: userId,
      status: { notIn: ["completed", "cancelled"] },
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 25,
    select: {
      id: true,
      status: true,
      type: true,
      dueDate: true,
      updatedAt: true,
      influencer: {
        select: { id: true, name: true, instagramHandle: true },
      },
      brand: { select: { name: true } },
      campaign: { select: { name: true } },
    },
  });

  const activeCollabIds = collabs.map((c) => c.id);

  // Pending assets on my active collabs (status pending or submitted, OR overdue)
  const pendingAssets =
    activeCollabIds.length === 0
      ? []
      : await prisma.asset.findMany({
          where: {
            collaborationId: { in: activeCollabIds },
            OR: [
              { status: { in: ["pending", "submitted"] } },
              { dueDate: { lt: today }, status: { notIn: ["approved", "published"] } },
            ],
          },
          orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
          take: 25,
          select: {
            id: true,
            status: true,
            platform: true,
            contentType: true,
            dueDate: true,
            collaborationId: true,
            influencer: { select: { name: true, instagramHandle: true } },
          },
        });

  const overdueCollabs = collabs.filter(
    (c) => c.dueDate && new Date(c.dueDate) < today
  );

  return NextResponse.json({
    summary: {
      pendingCollabs: collabs.length,
      pendingAssets: pendingAssets.length,
      overdueCollabs: overdueCollabs.length,
    },
    collabs,
    assets: pendingAssets,
  });
}
