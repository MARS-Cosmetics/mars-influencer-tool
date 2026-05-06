import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  beginUpload,
  validateUploadRequest,
  isValidDocumentType,
  type DocumentType,
  type EntityType,
} from "@/lib/documents";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ENTITY_TYPES = ["agency", "influencer", "contract", "invoice"] as const;

// Authenticated upload — 30/user/hour
const PRESIGN_MAX = 30;
const PRESIGN_WINDOW_SECONDS = 60 * 60;

const Body = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid(),
  documentType: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-user rate limit
  const userId = session.user.id as string;
  const rl = await rateLimit(`user:${userId}:presign`, PRESIGN_MAX, PRESIGN_WINDOW_SECONDS);
  if (!rl.allowed) return rateLimitResponse(rl, PRESIGN_MAX);

  // Anyone logged in can request an upload URL today; tighten role-gating
  // when Wave 1 #3 lands. For now we still log who uploaded what.

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues.map((i) => i.message).join("; ") : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isValidDocumentType(body.documentType)) {
    return NextResponse.json({ error: `Unknown document type: ${body.documentType}` }, { status: 400 });
  }

  const validationError = validateUploadRequest({
    documentType: body.documentType,
    mimeType: body.mimeType,
    size: body.size,
    filename: body.filename,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError.message, code: validationError.code }, { status: 400 });
  }

  try {
    const result = await beginUpload({
      entityType: body.entityType as EntityType,
      entityId: body.entityId,
      documentType: body.documentType as DocumentType,
      filename: body.filename,
      mimeType: body.mimeType,
      size: body.size,
      uploadedBy: session.user.id as string,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[documents/presign] failed:", e);
    const message = e instanceof Error ? e.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
