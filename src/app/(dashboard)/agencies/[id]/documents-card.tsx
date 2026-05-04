"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { DocumentUpload, type UploadedDoc } from "@/components/document-upload";

const DOCS: { documentType: string; label: string; maxSizeMB: number; accept: string }[] = [
  { documentType: "aadhar", label: "Director / Partner Aadhar", maxSizeMB: 10, accept: "application/pdf,image/jpeg,image/png" },
  { documentType: "pan", label: "PAN Card", maxSizeMB: 10, accept: "application/pdf,image/jpeg,image/png" },
  { documentType: "gst", label: "GST Certificate", maxSizeMB: 10, accept: "application/pdf,image/jpeg,image/png" },
  { documentType: "udhyam", label: "Udhyam Registration", maxSizeMB: 10, accept: "application/pdf,image/jpeg,image/png" },
  { documentType: "roster", label: "Agency Roster", maxSizeMB: 25, accept: "application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" },
];

interface DocumentsCardProps {
  agencyId: string;
  initialDocs: Record<string, UploadedDoc | null>;  // keyed by documentType
}

export function AgencyDocumentsCard({ agencyId, initialDocs }: DocumentsCardProps) {
  const [docs, setDocs] = useState<Record<string, UploadedDoc | null>>(initialDocs);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-gray-400" />
          KYC & Compliance Documents
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Stored privately on Cloudflare R2. Each view generates a fresh 1-minute link. Old versions are kept for compliance.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCS.map((d) => (
          <DocumentUpload
            key={d.documentType}
            entityType="agency"
            entityId={agencyId}
            documentType={d.documentType}
            label={d.label}
            accept={d.accept}
            maxSizeMB={d.maxSizeMB}
            current={docs[d.documentType] ?? null}
            onUploaded={(doc) => setDocs((prev) => ({ ...prev, [d.documentType]: doc }))}
            onRemoved={() => setDocs((prev) => ({ ...prev, [d.documentType]: null }))}
          />
        ))}
      </CardContent>
    </Card>
  );
}
