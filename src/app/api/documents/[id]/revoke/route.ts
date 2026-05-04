import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeDocument } from "@/lib/documents";

export const runtime = "nodejs";

/**
 * POST /api/documents/[id]/revoke
 *
 * Admin kill-switch for a leaked or compromised document. After revoking,
 * the GET endpoint refuses to issue presigned URLs for this id; in-flight
 * URLs expire on their own (max 60s).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  try {
    await revokeDocument({
      documentId: id,
      revokedBy: session.user.id as string,
      reason: body?.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to revoke";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
