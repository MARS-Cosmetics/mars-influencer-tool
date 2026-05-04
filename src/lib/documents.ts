/**
 * Business logic for KYC + document storage.
 * Wraps prisma + r2.ts to provide higher-level operations.
 */

import { prisma } from "@/lib/db";
import { DocumentStatus, DocumentAccessAction } from "@/generated/prisma";
import type { DocumentRecordModel as DocumentRecord } from "@/generated/prisma/models/DocumentRecord";
import { bucket, buildKey, presignUpload, presignRead, headObject, deleteObject } from "@/lib/r2";

// ============================================================
// Per-document-type configuration
// ============================================================

export type DocumentType =
  | "aadhar"
  | "pan"
  | "gst"
  | "udhyam"
  | "roster"
  | "bank_proof"
  | "contract"
  | "invoice"
  | "other";

export type EntityType = "agency" | "influencer" | "contract" | "invoice";

interface DocumentTypeConfig {
  label: string;
  maxSizeBytes: number;
  allowedMimes: readonly string[];
}

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, DocumentTypeConfig> = {
  aadhar: {
    label: "Aadhar",
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  },
  pan: {
    label: "PAN",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  },
  gst: {
    label: "GST Certificate",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  },
  udhyam: {
    label: "Udhyam Registration",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  },
  roster: {
    label: "Agency Roster",
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB — rosters can be larger
    allowedMimes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ],
  },
  bank_proof: {
    label: "Bank Proof",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  },
  contract: {
    label: "Contract",
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimes: ["application/pdf"],
  },
  invoice: {
    label: "Invoice",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimes: ["application/pdf"],
  },
  other: {
    label: "Document",
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
  },
};

export function isValidDocumentType(t: string): t is DocumentType {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPE_CONFIG, t);
}

// ============================================================
// Validation
// ============================================================

export interface UploadValidationError {
  code: "invalid_type" | "mime_not_allowed" | "size_too_large" | "size_invalid" | "filename_invalid";
  message: string;
}

export function validateUploadRequest(args: {
  documentType: string;
  mimeType: string;
  size: number;
  filename: string;
}): UploadValidationError | null {
  const { documentType, mimeType, size, filename } = args;

  if (!isValidDocumentType(documentType)) {
    return { code: "invalid_type", message: `Unknown document type: ${documentType}` };
  }
  const cfg = DOCUMENT_TYPE_CONFIG[documentType];

  if (!cfg.allowedMimes.includes(mimeType)) {
    return {
      code: "mime_not_allowed",
      message: `${cfg.label} must be one of: ${cfg.allowedMimes.join(", ")}. Got: ${mimeType}`,
    };
  }

  if (!Number.isFinite(size) || size <= 0) {
    return { code: "size_invalid", message: "Invalid file size" };
  }
  if (size > cfg.maxSizeBytes) {
    const mb = (cfg.maxSizeBytes / 1024 / 1024).toFixed(0);
    return { code: "size_too_large", message: `${cfg.label} must be smaller than ${mb} MB` };
  }

  if (!filename || filename.length > 255 || filename.includes("/") || filename.includes("\\")) {
    return { code: "filename_invalid", message: "Invalid filename" };
  }

  return null;
}

// ============================================================
// Operations
// ============================================================

/**
 * Step 1 of upload: create a pending DocumentRecord and a presigned PUT URL.
 * The record is created first so we can track the intent even if the upload
 * never completes — periodic GC can clean up records with status='active'
 * that have no R2 object.
 */
export async function beginUpload(args: {
  entityType: EntityType;
  entityId: string;
  documentType: DocumentType;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}): Promise<{ documentId: string; storageKey: string; uploadUrl: string }> {
  const storageKey = buildKey({
    entityType: args.entityType,
    entityId: args.entityId,
    documentType: args.documentType,
    filename: args.filename,
  });

  const record = await prisma.documentRecord.create({
    data: {
      entityType: args.entityType,
      entityId: args.entityId,
      documentType: args.documentType,
      bucket: bucket(),
      storageKey,
      originalFilename: args.filename.slice(0, 255),
      mimeType: args.mimeType,
      sizeBytes: args.size,
      uploadedBy: args.uploadedBy,
      status: DocumentStatus.active,
    },
  });

  const { url } = await presignUpload({
    key: storageKey,
    contentType: args.mimeType,
    contentLength: args.size,
    expiresIn: 300,
  });

  return { documentId: record.id, storageKey, uploadUrl: url };
}

/**
 * Step 2 of upload: confirm the file exists in R2, then supersede any
 * previously-active document of the same (entity, type) pair.
 *
 * Atomicity: HEAD R2 first; if missing, mark this record as deleted and
 * throw. If R2 has it, do supersede + verify in a single transaction.
 */
export async function finalizeUpload(documentId: string): Promise<DocumentRecord> {
  const record = await prisma.documentRecord.findUnique({ where: { id: documentId } });
  if (!record) throw new Error("Document not found");
  if (record.status !== DocumentStatus.active) {
    throw new Error(`Document is not in active state (status=${record.status})`);
  }

  const head = await headObject(record.storageKey);
  if (!head.exists) {
    // Upload didn't complete; clean up the dangling record
    await prisma.documentRecord.update({
      where: { id: documentId },
      data: { status: DocumentStatus.deleted, deletedAt: new Date() },
    });
    throw new Error("File not found in storage. Upload may have been interrupted.");
  }

  // Supersede any other active document of the same (entity, type)
  return prisma.$transaction(async (tx) => {
    await tx.documentRecord.updateMany({
      where: {
        entityType: record.entityType,
        entityId: record.entityId,
        documentType: record.documentType,
        status: DocumentStatus.active,
        id: { not: documentId },
      },
      data: {
        status: DocumentStatus.superseded,
        supersededBy: documentId,
        supersededAt: new Date(),
      },
    });
    // Sync sizeBytes from R2 head (in case caller's claimed size was off)
    return tx.documentRecord.update({
      where: { id: documentId },
      data: head.size && head.size !== record.sizeBytes ? { sizeBytes: head.size } : {},
    });
  });
}

/**
 * Get the current active document for (entity, type), if any.
 */
export async function getActiveDocument(
  entityType: EntityType,
  entityId: string,
  documentType: DocumentType,
): Promise<DocumentRecord | null> {
  return prisma.documentRecord.findFirst({
    where: { entityType, entityId, documentType, status: DocumentStatus.active },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * Generate a fresh, short-lived presigned read URL for a document.
 * Refuses if the document is revoked or deleted.
 * Caller is responsible for auth + audit logging.
 */
export async function getDocumentReadUrl(args: {
  documentId: string;
  asAttachment?: boolean;
}): Promise<{ url: string; record: DocumentRecord } | { error: string }> {
  const record = await prisma.documentRecord.findUnique({ where: { id: args.documentId } });
  if (!record) return { error: "not_found" };
  if (record.status === DocumentStatus.revoked) return { error: "revoked" };
  if (record.status === DocumentStatus.deleted) return { error: "deleted" };

  const { url } = await presignRead({
    key: record.storageKey,
    asAttachment: args.asAttachment,
    filename: record.originalFilename,
    expiresIn: 60,
  });
  return { url, record };
}

/**
 * Soft-delete: mark the record as deleted, but retain the R2 object
 * for the configured retention period (handled by R2 lifecycle rules
 * or a separate GC job). Never call deleteObject() directly here.
 */
export async function softDeleteDocument(documentId: string): Promise<void> {
  await prisma.documentRecord.update({
    where: { id: documentId },
    data: { status: DocumentStatus.deleted, deletedAt: new Date() },
  });
}

/**
 * Revoke: kill switch when a doc is suspected leaked. Server stops issuing
 * presigned URLs; in-flight URLs expire on their own (60s max).
 */
export async function revokeDocument(args: {
  documentId: string;
  revokedBy: string;
  reason?: string;
}): Promise<void> {
  await prisma.documentRecord.update({
    where: { id: args.documentId },
    data: {
      status: DocumentStatus.revoked,
      revokedBy: args.revokedBy,
      revokedAt: new Date(),
      revokeReason: args.reason ?? null,
    },
  });
}

/**
 * GC: hard-delete from R2 for records that have been deleted/revoked
 * past the retention window. Run as a separate cron job.
 */
export async function purgeRecord(documentId: string): Promise<void> {
  const record = await prisma.documentRecord.findUnique({ where: { id: documentId } });
  if (!record) return;
  await deleteObject(record.storageKey).catch(() => {/* ignore — file may already be gone */});
  await prisma.documentRecord.delete({ where: { id: documentId } });
}

// ============================================================
// Audit logging
// ============================================================

export async function logAccess(args: {
  documentId: string;
  userId: string | null;
  action: DocumentAccessAction;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  await prisma.documentAccessLog.create({
    data: {
      documentId: args.documentId,
      userId: args.userId,
      action: args.action,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    },
  }).catch((e) => {
    // Don't fail the user request if audit log fails — but do scream
    console.error("[documents] audit log write failed:", e);
  });
}
