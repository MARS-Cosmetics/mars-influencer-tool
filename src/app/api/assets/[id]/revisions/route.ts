import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - List revisions for an asset
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  const revisions = await prisma.assetRevision.findMany({
    where: { assetId: id },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(revisions);
}

// POST - Submit a new revision
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const body = await req.json();

  // Get current version
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { version: true, contentUrl: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const newVersion = asset.version + 1;

  // Create revision record for the current version (archive it)
  // Then update the asset with the new content URL
  const [revision, updatedAsset] = await prisma.$transaction([
    prisma.assetRevision.create({
      data: {
        assetId: id,
        version: newVersion,
        contentUrl: body.contentUrl,
        status: "submitted",
      },
    }),
    prisma.asset.update({
      where: { id },
      data: {
        contentUrl: body.contentUrl,
        version: newVersion,
        status: "in_review",
      },
    }),
  ]);

  // Log activity
  const assetWithCollab = await prisma.asset.findUnique({
    where: { id },
    select: { collaborationId: true },
  });
  if (assetWithCollab) {
    await prisma.activityLog.create({
      data: {
        entityType: "asset",
        entityId: id,
        action: "revision_submitted",
        description: `Content revision v${newVersion} submitted`,
        changes: { version: newVersion, contentUrl: body.contentUrl },
      },
    }).catch(() => {});
  }

  return NextResponse.json({ revision, asset: updatedAsset });
}
