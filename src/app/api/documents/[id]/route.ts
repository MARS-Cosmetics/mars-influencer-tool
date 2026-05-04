import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DocumentAccessAction } from "@/generated/prisma";
import { getDocumentReadUrl, softDeleteDocument, logAccess } from "@/lib/documents";

export const runtime = "nodejs";

/**
 * GET /api/documents/[id]?download=1
 *
 * Auth-checks, audit-logs, then 302-redirects to a fresh 60-second
 * presigned R2 URL. The user-visible URL never contains a signature.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await params;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  if (!session?.user) {
    await logAccess({
      documentId: id,
      userId: null,
      action: DocumentAccessAction.denied,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const asAttachment = request.nextUrl.searchParams.get("download") === "1";

  const result = await getDocumentReadUrl({ documentId: id, asAttachment });

  if ("error" in result) {
    await logAccess({
      documentId: id,
      userId,
      action: result.error === "revoked"
        ? DocumentAccessAction.revoked
        : DocumentAccessAction.denied,
      ipAddress,
      userAgent,
    });
    const status = result.error === "not_found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  await logAccess({
    documentId: id,
    userId,
    action: asAttachment ? DocumentAccessAction.download : DocumentAccessAction.view,
    ipAddress,
    userAgent,
  });

  return NextResponse.redirect(result.url, 302);
}

/**
 * DELETE /api/documents/[id]
 * Soft-delete only. Status flips to 'deleted'; the R2 object stays per
 * retention policy until a separate GC job purges it.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await softDeleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
