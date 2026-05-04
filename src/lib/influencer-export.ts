import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma";

// Columns to include in the export.
// Order matters — this is column order in Excel/CSV.
// Keep these in sync with influencer-bulk-import.ts COLUMNS where possible
// so export → edit → re-import works as a round trip.
export const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: "id",                header: "id" },
  { key: "name",              header: "name" },
  { key: "email",             header: "email" },
  { key: "phone",             header: "phone" },
  { key: "whatsappNumber",    header: "whatsappNumber" },
  { key: "dateOfBirth",       header: "dateOfBirth" },
  { key: "gender",            header: "gender" },
  { key: "bio",               header: "bio" },
  { key: "instagramHandle",   header: "instagramHandle" },
  { key: "youtubeHandle",     header: "youtubeHandle" },
  { key: "twitterHandle",     header: "twitterHandle" },
  { key: "tiktokHandle",      header: "tiktokHandle" },
  { key: "linkedinUrl",       header: "linkedinUrl" },
  { key: "blogUrl",           header: "blogUrl" },
  { key: "addressLine1",      header: "addressLine1" },
  { key: "addressLine2",      header: "addressLine2" },
  { key: "city",              header: "city" },
  { key: "state",             header: "state" },
  { key: "pincode",           header: "pincode" },
  { key: "country",           header: "country" },
  { key: "tier",              header: "tier" },
  { key: "primaryLanguage",   header: "primaryLanguage" },
  { key: "categories",        header: "categories" },
  { key: "contentNiches",     header: "contentNiches" },
  { key: "languages",         header: "languages" },
  { key: "panNumber",         header: "panNumber" },
  { key: "gstin",             header: "gstin" },
  { key: "bankAccountName",   header: "bankAccountName" },
  { key: "bankAccountNumber", header: "bankAccountNumber" },
  { key: "bankIfscCode",      header: "bankIfscCode" },
  { key: "bankName",          header: "bankName" },
  { key: "upiId",             header: "upiId" },
  { key: "paymentPreference", header: "paymentPreference" },
  { key: "rateInstagramReel", header: "rateInstagramReel" },
  { key: "rateInstagramStory",header: "rateInstagramStory" },
  { key: "rateInstagramPost", header: "rateInstagramPost" },
  { key: "rateYoutubeVideo",  header: "rateYoutubeVideo" },
  { key: "rateYoutubeShort",  header: "rateYoutubeShort" },
  { key: "rateBlogPost",      header: "rateBlogPost" },
  { key: "rateTwitterPost",   header: "rateTwitterPost" },
  { key: "rateCurrency",      header: "rateCurrency" },
  { key: "rateNotes",         header: "rateNotes" },
  { key: "source",            header: "source" },
  { key: "status",            header: "status" },
  { key: "referredBy",        header: "referredBy" },
  { key: "managedBy",         header: "managedBy" },
  { key: "tags",              header: "tags" },
  { key: "internalNotes",     header: "internalNotes" },
  { key: "igFollowerCount",   header: "igFollowerCount" },
  { key: "igFollowingCount",  header: "igFollowingCount" },
  { key: "igPostCount",       header: "igPostCount" },
  { key: "igEngagementRate",  header: "igEngagementRate" },
  { key: "igAvgLikes",        header: "igAvgLikes" },
  { key: "igAvgComments",     header: "igAvgComments" },
  { key: "igAvgReelViews",    header: "igAvgReelViews" },
  { key: "igMedianReelViews", header: "igMedianReelViews" },
  { key: "pastCollabCount",   header: "pastCollabCount" },
  { key: "isVerified",        header: "isVerified" },
  { key: "metricsLastSyncedAt", header: "metricsLastSyncedAt" },
  { key: "createdAt",         header: "createdAt" },
  { key: "updatedAt",         header: "updatedAt" },
];

// Fields to actually fetch from Prisma. Limits over-fetching of JSON blobs
// like platformAnalytics / metadata that we don't export.
export const EXPORT_PRISMA_SELECT = Object.fromEntries(
  EXPORT_COLUMNS.map((c) => [c.key, true]),
) as Prisma.InfluencerSelect;

// Format a single Prisma row into a plain object suitable for xlsx/csv.
// Arrays → comma-joined strings. Dates → ISO YYYY-MM-DD or full ISO.
// Decimals → number. null/undefined → empty string.
export function formatRowForExport(row: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const col of EXPORT_COLUMNS) {
    const v = row[col.key];
    if (v === null || v === undefined) {
      out[col.header] = "";
      continue;
    }
    if (Array.isArray(v)) {
      out[col.header] = v.join(", ");
      continue;
    }
    if (v instanceof Date) {
      // Use date-only for dateOfBirth, full ISO for timestamps
      out[col.header] = col.key === "dateOfBirth"
        ? v.toISOString().slice(0, 10)
        : v.toISOString();
      continue;
    }
    if (typeof v === "object") {
      // Prisma Decimal — has a toString
      const d = v as { toString?: () => string; toNumber?: () => number };
      if (typeof d.toNumber === "function") {
        out[col.header] = d.toNumber();
      } else {
        out[col.header] = String(v);
      }
      continue;
    }
    if (typeof v === "boolean") {
      out[col.header] = v ? "TRUE" : "FALSE";
      continue;
    }
    out[col.header] = v as string | number;
  }
  return out;
}

export function buildExportXlsx(rows: Record<string, unknown>[]): Buffer {
  const formatted = rows.map(formatRowForExport);
  const headers = EXPORT_COLUMNS.map((c) => c.header);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formatted, { header: headers });
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "Influencers");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildExportCsv(rows: Record<string, unknown>[]): string {
  const formatted = rows.map(formatRowForExport);
  const headers = EXPORT_COLUMNS.map((c) => c.header);

  const escape = (val: string | number): string => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of formatted) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
