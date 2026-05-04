"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "text/csv": "CSV",
};

function acceptHumanReadable(accept: string): string {
  const labels = accept
    .split(",")
    .map((m) => m.trim())
    .map((m) => MIME_LABELS[m] ?? m)
    .filter(Boolean);
  // de-duplicate while preserving order
  const seen = new Set<string>();
  const unique = labels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
  return unique.join(", ") || "Any file";
}

export interface UploadedDoc {
  id: string;            // DocumentRecord.id
  filename: string;
  uploadedAt?: string;
}

interface DocumentUploadProps {
  entityType: "agency" | "influencer" | "contract" | "invoice";
  entityId: string;
  documentType: string;          // "aadhar" | "pan" | "gst" | etc.
  label: string;                 // "Aadhar", "PAN Card", etc.
  accept?: string;               // file input accept attribute
  maxSizeMB?: number;            // hint shown to user
  current?: UploadedDoc | null;  // currently saved doc, if any
  onUploaded: (doc: UploadedDoc) => void;
  onRemoved?: () => void;
  disabled?: boolean;
}

export function DocumentUpload({
  entityType,
  entityId,
  documentType,
  label,
  accept = "application/pdf,image/jpeg,image/png",
  maxSizeMB = 10,
  current,
  onUploaded,
  onRemoved,
  disabled,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);

  async function handleFile(file: File) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`${label} must be smaller than ${maxSizeMB} MB`);
      return;
    }

    setBusy("uploading");
    try {
      // 1. ask server for a presigned URL
      const presignRes = await fetch("/api/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          documentType,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || `Presign failed (${presignRes.status})`);
      }
      const { documentId, uploadUrl } = await presignRes.json();

      // 2. PUT the file directly to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        throw new Error(`Upload to storage failed (${putRes.status}). ${text.slice(0, 200)}`);
      }

      // 3. tell server we're done so it can verify + supersede
      const finalizeRes = await fetch(`/api/documents/${documentId}/finalize`, { method: "POST" });
      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}));
        throw new Error(err.error || `Finalize failed (${finalizeRes.status})`);
      }

      onUploaded({
        id: documentId,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!current) return;
    if (!confirm(`Remove the current ${label}? It will be soft-deleted (kept in storage for audit).`)) return;

    setBusy("removing");
    try {
      const res = await fetch(`/api/documents/${current.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove");
      }
      onRemoved?.();
      toast.success(`${label} removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="rounded-md border p-3 space-y-2">
        {current ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm" title={current.filename}>
              {current.filename}
            </span>
            <a
              href={`/api/documents/${current.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              title="View (1-min link)"
            >
              View <ExternalLink className="size-3" />
            </a>
            <a
              href={`/api/documents/${current.id}?download=1`}
              className="text-xs text-primary hover:underline"
              title="Download"
            >
              Download
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy !== null || disabled}
              onClick={handleRemove}
              title="Remove"
            >
              {busy === "removing" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No file uploaded yet.</p>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={busy !== null || disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:opacity-90"
          />
          {busy === "uploading" && <Loader2 className="size-4 animate-spin shrink-0" />}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {acceptHumanReadable(accept)}. Max {maxSizeMB} MB. Stored securely; only authorized users can view.
        </p>
      </div>
    </div>
  );
}
