import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookmarkStatus } from "@/generated/prisma";

// Prisma 7 generates enums as `const` objects (not TS enums), so z.nativeEnum()
// rejects them. Derive an explicit string-literal enum from the const's values.
const BOOKMARK_STATUS_VALUES = Object.values(BookmarkStatus) as [
  BookmarkStatus,
  ...BookmarkStatus[],
];

const PatchSchema = z.object({
  status: z.enum(BOOKMARK_STATUS_VALUES).optional(),
  note: z.string().max(2000).nullable().optional(),
});

// GET a single bookmark by id — used by /influencers/new for prefill
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const bookmark = await prisma.discoveryBookmark.findUnique({
      where: { id },
    });
    if (!bookmark) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("[/api/discovery/bookmark/[id] GET] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmark" },
      { status: 500 },
    );
  }
}

// PATCH — update status and/or note on a bookmark
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { status, note } = parsed.data;
    if (status === undefined && note === undefined) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 },
      );
    }

    const existing = await prisma.discoveryBookmark.findUnique({
      where: { id },
      include: { campaign: { select: { brandId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Authorization: match the Discovered-page visibility rule.
    //   - admins can edit everything
    //   - branded users can edit bookmarks on THEIR brand's campaigns
    //   - unbranded users can only edit bookmarks they created
    const sessionUser = session.user as {
      id: string;
      role?: string;
      brandId?: string | null;
    };
    const canEdit =
      sessionUser.role === "admin" ||
      (sessionUser.brandId &&
        existing.campaign?.brandId === sessionUser.brandId) ||
      existing.userId === sessionUser.id;

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: {
      status?: BookmarkStatus;
      statusUpdatedAt?: Date;
      note?: string | null;
    } = {};
    if (status !== undefined) {
      data.status = status;
      data.statusUpdatedAt = new Date();
    }
    if (note !== undefined) {
      data.note = note;
    }

    const updated = await prisma.discoveryBookmark.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[/api/discovery/bookmark/[id] PATCH] error:", error);
    // Expose the real cause in non-production so UI errors are debuggable.
    const detail =
      process.env.NODE_ENV !== "production"
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined;
    return NextResponse.json(
      { error: "Failed to update bookmark", detail },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const bookmark = await prisma.discoveryBookmark.findUnique({
      where: { id },
      include: { campaign: { select: { brandId: true } } },
    });
    if (!bookmark) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Match PATCH / Discovered-page visibility: admin or same-brand or owner.
    const sessionUser = session.user as {
      id: string;
      role?: string;
      brandId?: string | null;
    };
    const canDelete =
      sessionUser.role === "admin" ||
      (sessionUser.brandId &&
        bookmark.campaign?.brandId === sessionUser.brandId) ||
      bookmark.userId === sessionUser.id;

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.discoveryBookmark.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/discovery/bookmark/[id] DELETE] error:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 },
    );
  }
}
