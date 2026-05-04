import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { finalizeUpload } from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const record = await finalizeUpload(id);
    return NextResponse.json({
      id: record.id,
      storageKey: record.storageKey,
      sizeBytes: record.sizeBytes,
      verificationStatus: record.verificationStatus,
      uploadedAt: record.uploadedAt,
    });
  } catch (e) {
    console.error("[documents/finalize] failed:", e);
    const message = e instanceof Error ? e.message : "Failed to finalize upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
