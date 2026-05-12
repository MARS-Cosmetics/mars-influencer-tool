/**
 * Weekly Payment Excel export.
 *
 * One row per Asset. Status column reflects the collab's Payment row.
 * Invoice link + Finance Comments are intentionally blank — those come from
 * Outlook / are filled offline by the finance team.
 *
 * Friendly status labels: pending → "Pending Approval", approved → "Approved
 * for Payment", paid → "Payment Completed", invoice_issue → "Invoice Issue".
 * Other DB statuses (processing/failed/cancelled) fall through with their
 * raw name so finance can still see odd states.
 */
// xlsx-js-style is a drop-in fork of SheetJS that preserves cell styling on
// write (the upstream community edition silently drops it). Same API.
import * as XLSX from "xlsx-js-style";
import type { PaymentStatus } from "@/generated/prisma";

export const PAYMENT_EXPORT_COLUMNS = [
  "POC",
  "Payment Status",
  "Due Date",
  "Reel Live Date",
  "Account Number",
  "IFSC Code",
  "Live Link",
  "Invoice Link",
  "Comments",
  "Account",
  "Supporting Document",
  "Finance Comments",
] as const;

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved for Payment",
  invoice_issue: "Invoice Issue",
  paid: "Payment Completed",
  processing: "Processing",
  failed: "Failed",
  cancelled: "Cancelled",
};

// Synthetic label used by the Excel export for barter collabs — they have
// no Payment row so no real PaymentStatus, but finance still needs a visible
// marker in the status column.
const SYNTHETIC_LABELS: Record<string, string> = {
  barter: "Barter",
};

export function paymentStatusLabel(s: PaymentStatus | string | null | undefined): string {
  if (!s) return "";
  return (
    (STATUS_LABEL as Record<string, string>)[s] ?? SYNTHETIC_LABELS[s] ?? s
  );
}

export interface PaymentExportRow {
  poc: string;
  // Accepts the synthetic "barter" label too, not just enum values.
  paymentStatus: PaymentStatus | "barter" | null;
  dueDate: Date | string | null;
  reelLiveDate: Date | string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  liveLink: string | null;
  invoiceLink: string | null; // intentionally blank from source — finance fills externally
  comments: string | null;
  account: string | null; // bank account holder name
  supportingDocument: string | null; // PAN / GSTIN summary
  financeComments: string | null; // blank on export, filled offline
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Mars brand red for the header band. Picked from the existing sidebar.
// xlsx-js-style's `Border` type isn't exported in its d.ts, so we use plain
// object literals (SheetJS reads them structurally at runtime).
const HEADER_FILL_HEX = "A6192E";
const ROW_BORDER = { style: "thin", color: { rgb: "E5E5E5" } };

const HEADER_STYLE = {
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL_HEX } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: ROW_BORDER,
    bottom: ROW_BORDER,
    left: ROW_BORDER,
    right: ROW_BORDER,
  },
};

const BODY_STYLE = {
  font: { sz: 10 },
  alignment: { vertical: "center", wrapText: true },
  border: {
    top: ROW_BORDER,
    bottom: ROW_BORDER,
    left: ROW_BORDER,
    right: ROW_BORDER,
  },
};

export function buildPaymentExportBuffer(rows: PaymentExportRow[]): Buffer {
  // Header first, then one row per asset, in the exact order the finance
  // team asked for.
  const aoa: (string | null)[][] = [
    [...PAYMENT_EXPORT_COLUMNS],
    ...rows.map((r) => [
      r.poc,
      paymentStatusLabel(r.paymentStatus),
      formatDate(r.dueDate),
      formatDate(r.reelLiveDate),
      r.accountNumber,
      r.ifscCode,
      r.liveLink,
      r.invoiceLink,
      r.comments,
      r.account,
      r.supportingDocument,
      r.financeComments,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Reasonable column widths so finance doesn't have to resize.
  ws["!cols"] = [
    { wch: 18 }, // POC
    { wch: 22 }, // Payment Status
    { wch: 12 }, // Due Date
    { wch: 14 }, // Reel Live Date
    { wch: 18 }, // Account Number
    { wch: 14 }, // IFSC
    { wch: 40 }, // Live Link
    { wch: 30 }, // Invoice Link
    { wch: 30 }, // Comments
    { wch: 24 }, // Account
    { wch: 28 }, // Supporting Document
    { wch: 30 }, // Finance Comments
  ];

  // Taller header row for the bigger bold text.
  ws["!rows"] = [{ hpx: 28 }];

  // Freeze the header so the column names stay visible while finance scrolls.
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as never;
  // Plain SheetJS uses `!views[].state = "frozen"`; xlsx-js-style accepts the
  // simpler form above on most readers. Keep both for safety:
  ws["!views"] = [{ state: "frozen", topLeftCell: "A2", ySplit: 1 }] as never;

  // Apply per-cell styling. SheetJS stores cells on the sheet keyed by A1
  // notation — we walk every cell in the used range and set its `.s` prop.
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref] as { s?: unknown } | undefined;
      if (!cell) continue;
      cell.s = R === 0 ? HEADER_STYLE : BODY_STYLE;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Payments");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}

export function exportFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `payments-${y}-${m}-${d}.xlsx`;
}
