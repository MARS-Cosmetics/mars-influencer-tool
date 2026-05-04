import { z } from "zod";
import * as XLSX from "xlsx";
import {
  validatePhone,
  validateEmail,
  validatePAN,
  validateGST,
  validatePincode,
  validateIFSC,
  validateUPI,
  validateInstagramHandle,
} from "@/lib/validations";

// ----------------------------------------------------------------------------
// Column definitions — this is the source of truth for both the template and
// the import parser. Order here = order in the generated template.
// ----------------------------------------------------------------------------

type FieldType = "string" | "number" | "date" | "enum" | "csv";

interface ColumnDef {
  key: string;
  header: string;
  required: boolean;
  type: FieldType;
  enumValues?: readonly string[];
  example?: string;
  description?: string;
}

const TIER_VALUES = ["nano", "micro", "mid", "macro", "mega"] as const;
const GENDER_VALUES = ["male", "female", "non_binary", "other"] as const;
const PAYMENT_PREF_VALUES = ["bank_transfer", "upi", "other"] as const;
const SOURCE_VALUES = [
  "google_form",
  "instagram_dm",
  "email",
  "manual_discovery",
  "inbound",
  "referral",
  "agency",
  "event",
] as const;
const STATUS_VALUES = [
  "discovered",
  "contacted",
  "form_submitted",
  "demographics_verified",
  "onboarded",
  "active",
  "inactive",
  "blacklisted",
  "do_not_contact",
] as const;
const MANAGED_BY_VALUES = ["self", "agency"] as const;

export const COLUMNS: readonly ColumnDef[] = [
  // Basic profile
  { key: "name",            header: "name",            required: true,  type: "string", example: "Anurag Sharma", description: "Full name (REQUIRED)" },
  { key: "email",           header: "email",           required: false, type: "string", example: "user@example.com" },
  { key: "phone",           header: "phone",           required: false, type: "string", example: "+91 9876543210" },
  { key: "whatsappNumber",  header: "whatsappNumber",  required: false, type: "string", example: "+91 9876543210" },
  { key: "dateOfBirth",     header: "dateOfBirth",     required: false, type: "date",   example: "1995-03-15", description: "YYYY-MM-DD" },
  { key: "gender",          header: "gender",          required: false, type: "enum", enumValues: GENDER_VALUES, example: "male" },
  { key: "bio",             header: "bio",             required: false, type: "string", example: "Beauty creator from Mumbai" },

  // Social handles
  { key: "instagramHandle", header: "instagramHandle", required: false, type: "string", example: "anurag_sharma", description: "Without @ symbol; must be unique" },
  { key: "youtubeHandle",   header: "youtubeHandle",   required: false, type: "string", example: "@anuragchannel" },
  { key: "twitterHandle",   header: "twitterHandle",   required: false, type: "string", example: "anurag_x" },
  { key: "tiktokHandle",    header: "tiktokHandle",    required: false, type: "string", example: "anurag.tt" },
  { key: "linkedinUrl",     header: "linkedinUrl",     required: false, type: "string", example: "https://linkedin.com/in/anurag" },
  { key: "blogUrl",         header: "blogUrl",         required: false, type: "string", example: "https://anurag.blog" },

  // Location
  { key: "addressLine1",    header: "addressLine1",    required: false, type: "string" },
  { key: "addressLine2",    header: "addressLine2",    required: false, type: "string" },
  { key: "city",            header: "city",            required: false, type: "string", example: "Mumbai" },
  { key: "state",           header: "state",           required: false, type: "string", example: "Maharashtra" },
  { key: "pincode",         header: "pincode",         required: false, type: "string", example: "400001" },
  { key: "country",         header: "country",         required: false, type: "string", example: "India" },

  // Tier & category
  { key: "tier",            header: "tier",            required: false, type: "enum", enumValues: TIER_VALUES, example: "micro" },
  { key: "primaryLanguage", header: "primaryLanguage", required: false, type: "string", example: "english" },
  { key: "categories",      header: "categories",      required: false, type: "csv",    example: "skincare,haircare", description: "Comma-separated" },
  { key: "contentNiches",   header: "contentNiches",   required: false, type: "csv",    example: "GRWM,reviews", description: "Comma-separated" },
  { key: "languages",       header: "languages",       required: false, type: "csv",    example: "english,hindi", description: "Comma-separated" },

  // Financial
  { key: "panNumber",        header: "panNumber",        required: false, type: "string", example: "ABCDE1234F" },
  { key: "gstin",            header: "gstin",            required: false, type: "string" },
  { key: "bankAccountName",  header: "bankAccountName",  required: false, type: "string" },
  { key: "bankAccountNumber",header: "bankAccountNumber",required: false, type: "string" },
  { key: "bankIfscCode",     header: "bankIfscCode",     required: false, type: "string", example: "HDFC0001234" },
  { key: "bankName",         header: "bankName",         required: false, type: "string" },
  { key: "upiId",            header: "upiId",            required: false, type: "string", example: "name@upi" },
  { key: "paymentPreference",header: "paymentPreference",required: false, type: "enum", enumValues: PAYMENT_PREF_VALUES, example: "bank_transfer" },

  // Rate card
  { key: "rateInstagramReel",  header: "rateInstagramReel",  required: false, type: "number" },
  { key: "rateInstagramStory", header: "rateInstagramStory", required: false, type: "number" },
  { key: "rateInstagramPost",  header: "rateInstagramPost",  required: false, type: "number" },
  { key: "rateYoutubeVideo",   header: "rateYoutubeVideo",   required: false, type: "number" },
  { key: "rateYoutubeShort",   header: "rateYoutubeShort",   required: false, type: "number" },
  { key: "rateBlogPost",       header: "rateBlogPost",       required: false, type: "number" },
  { key: "rateTwitterPost",    header: "rateTwitterPost",    required: false, type: "number" },
  { key: "rateCurrency",       header: "rateCurrency",       required: false, type: "string", example: "INR" },
  { key: "rateNotes",          header: "rateNotes",          required: false, type: "string" },

  // Onboarding
  { key: "source",     header: "source",     required: false, type: "enum", enumValues: SOURCE_VALUES, example: "manual_discovery" },
  { key: "status",     header: "status",     required: false, type: "enum", enumValues: STATUS_VALUES, example: "discovered" },
  { key: "referredBy", header: "referredBy", required: false, type: "string" },
  { key: "managedBy",  header: "managedBy",  required: false, type: "enum", enumValues: MANAGED_BY_VALUES, example: "self" },

  // Tags & notes
  { key: "tags",          header: "tags",          required: false, type: "csv", example: "vegan,luxury", description: "Comma-separated" },
  { key: "internalNotes", header: "internalNotes", required: false, type: "string" },

  // Instagram metrics
  { key: "igFollowerCount",   header: "igFollowerCount",   required: false, type: "number" },
  { key: "igFollowingCount",  header: "igFollowingCount",  required: false, type: "number" },
  { key: "igPostCount",       header: "igPostCount",       required: false, type: "number" },
  { key: "igEngagementRate",  header: "igEngagementRate",  required: false, type: "number", description: "Percentage e.g. 4.5" },
  { key: "igAvgLikes",        header: "igAvgLikes",        required: false, type: "number" },
  { key: "igAvgComments",     header: "igAvgComments",     required: false, type: "number" },
  { key: "igAvgReelViews",    header: "igAvgReelViews",    required: false, type: "number" },
];

// ----------------------------------------------------------------------------
// Template generation
// ----------------------------------------------------------------------------

export function buildTemplateXlsx(): Buffer {
  const headers = COLUMNS.map((c) => c.header + (c.required ? " *" : ""));
  const exampleRow = COLUMNS.map((c) => c.example ?? "");

  const wb = XLSX.utils.book_new();

  // Sheet 1 — data with one example row
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  // Set reasonable column widths
  ws["!cols"] = COLUMNS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "Influencers");

  // Sheet 2 — instructions
  const instructions: string[][] = [
    ["MARS Influencer — Bulk Import Template"],
    [""],
    ["• Required columns are marked with an asterisk (*) in the header"],
    ["• Delete the example row before importing your real data"],
    ["• Comma-separated columns: categories, contentNiches, languages, tags"],
    ["• Date format: YYYY-MM-DD (e.g. 1995-03-15)"],
    [""],
    ["Column", "Required", "Type", "Allowed values / Example"],
    ...COLUMNS.map((c) => [
      c.header,
      c.required ? "YES" : "no",
      c.type,
      c.enumValues ? c.enumValues.join(" | ") : (c.description ?? c.example ?? ""),
    ]),
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildTemplateCsv(): string {
  const headers = COLUMNS.map((c) => c.header + (c.required ? " *" : ""));
  const example = COLUMNS.map((c) => c.example ?? "");
  return [headers.join(","), example.join(",")].join("\n");
}

// ----------------------------------------------------------------------------
// Parsing
// ----------------------------------------------------------------------------

// Parse uploaded buffer (xlsx or csv) → array of raw row objects keyed by header
export function parseUpload(buf: Buffer, filename: string): Record<string, unknown>[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const wb = XLSX.read(buf, { type: "buffer", raw: !isCsv });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];

  // Convert to array of objects; xlsx uses first row as keys
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  // Strip the " *" suffix from headers so callers see clean keys
  return rows.map((row) => {
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      const cleanKey = key.replace(/\s*\*\s*$/, "").trim();
      cleaned[cleanKey] = row[key];
    }
    return cleaned;
  });
}

// ----------------------------------------------------------------------------
// Validation + normalization
// ----------------------------------------------------------------------------

export interface RowError {
  row: number;          // 1-indexed for the human; row 1 = first data row (after header)
  field: string;
  value: string;
  message: string;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;  // ready to insert via prisma.influencer.create
}

export interface ValidationResult {
  valid: ParsedRow[];
  errors: RowError[];
}

// helper: convert "" / undefined → undefined, otherwise return trimmed string
function nz(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length === 0 ? undefined : s;
}

function parseCsvList(value: unknown): string[] | undefined {
  const s = nz(value);
  if (!s) return undefined;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseNumber(value: unknown): number | undefined {
  const s = nz(value);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;  // NaN signals "tried but invalid"
}

function parseDate(value: unknown): Date | undefined | "INVALID" {
  const s = nz(value);
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "INVALID";
  return d;
}

export function validateAndNormalize(
  rawRows: Record<string, unknown>[],
): ValidationResult {
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 1;
    const rowErrors: RowError[] = [];
    const data: Record<string, unknown> = {};

    // ------ name (required) ------
    const name = nz(row.name);
    if (!name) {
      rowErrors.push({ row: rowNumber, field: "name", value: "", message: "Required field missing" });
    } else {
      data.name = name;
    }

    // ------ string fields with format validation ------
    const email = nz(row.email);
    if (email) {
      if (!validateEmail(email)) rowErrors.push({ row: rowNumber, field: "email", value: email, message: "Invalid email format" });
      else data.email = email;
    }

    const phone = nz(row.phone);
    if (phone) {
      if (!validatePhone(phone)) rowErrors.push({ row: rowNumber, field: "phone", value: phone, message: "Invalid Indian phone number" });
      else data.phone = phone;
    }

    const whatsapp = nz(row.whatsappNumber);
    if (whatsapp) {
      if (!validatePhone(whatsapp)) rowErrors.push({ row: rowNumber, field: "whatsappNumber", value: whatsapp, message: "Invalid Indian phone number" });
      else data.whatsappNumber = whatsapp;
    }

    const igHandle = nz(row.instagramHandle);
    if (igHandle) {
      const cleaned = igHandle.startsWith("@") ? igHandle.slice(1) : igHandle;
      if (!validateInstagramHandle(cleaned)) {
        rowErrors.push({ row: rowNumber, field: "instagramHandle", value: igHandle, message: "Invalid Instagram handle" });
      } else {
        data.instagramHandle = cleaned;
      }
    }

    const pan = nz(row.panNumber);
    if (pan) {
      if (!validatePAN(pan)) rowErrors.push({ row: rowNumber, field: "panNumber", value: pan, message: "Invalid PAN format (e.g. ABCDE1234F)" });
      else data.panNumber = pan.toUpperCase();
    }

    const gstin = nz(row.gstin);
    if (gstin) {
      if (!validateGST(gstin)) rowErrors.push({ row: rowNumber, field: "gstin", value: gstin, message: "Invalid GSTIN format" });
      else data.gstin = gstin.toUpperCase();
    }

    const pincode = nz(row.pincode);
    if (pincode) {
      if (!validatePincode(pincode)) rowErrors.push({ row: rowNumber, field: "pincode", value: pincode, message: "Pincode must be 6 digits" });
      else data.pincode = pincode;
    }

    const ifsc = nz(row.bankIfscCode);
    if (ifsc) {
      if (!validateIFSC(ifsc)) rowErrors.push({ row: rowNumber, field: "bankIfscCode", value: ifsc, message: "Invalid IFSC code" });
      else data.bankIfscCode = ifsc.toUpperCase();
    }

    const upi = nz(row.upiId);
    if (upi) {
      if (!validateUPI(upi)) rowErrors.push({ row: rowNumber, field: "upiId", value: upi, message: "Invalid UPI ID" });
      else data.upiId = upi;
    }

    // ------ enum fields ------
    const enumChecks: Array<[string, readonly string[]]> = [
      ["tier", TIER_VALUES],
      ["gender", GENDER_VALUES],
      ["paymentPreference", PAYMENT_PREF_VALUES],
      ["source", SOURCE_VALUES],
      ["status", STATUS_VALUES],
      ["managedBy", MANAGED_BY_VALUES],
    ];
    for (const [key, allowed] of enumChecks) {
      const v = nz(row[key]);
      if (v) {
        if (!allowed.includes(v)) {
          rowErrors.push({ row: rowNumber, field: key, value: v, message: `Must be one of: ${allowed.join(", ")}` });
        } else {
          data[key] = v;
        }
      }
    }

    // ------ plain string fields (no format check needed) ------
    const stringFields = [
      "bio",
      "youtubeHandle", "twitterHandle", "tiktokHandle", "linkedinUrl", "blogUrl",
      "addressLine1", "addressLine2", "city", "state", "country",
      "primaryLanguage",
      "bankAccountName", "bankAccountNumber", "bankName",
      "rateCurrency", "rateNotes",
      "referredBy", "internalNotes",
    ];
    for (const f of stringFields) {
      const v = nz(row[f]);
      if (v) data[f] = v;
    }

    // ------ csv (array) fields ------
    for (const f of ["categories", "contentNiches", "languages", "tags"]) {
      const arr = parseCsvList(row[f]);
      if (arr && arr.length > 0) data[f] = arr;
    }

    // ------ number fields ------
    const numberFields = [
      "rateInstagramReel", "rateInstagramStory", "rateInstagramPost",
      "rateYoutubeVideo", "rateYoutubeShort", "rateBlogPost", "rateTwitterPost",
      "igFollowerCount", "igFollowingCount", "igPostCount",
      "igEngagementRate", "igAvgLikes", "igAvgComments", "igAvgReelViews",
    ];
    for (const f of numberFields) {
      const n = parseNumber(row[f]);
      if (n === undefined) continue;
      if (Number.isNaN(n)) {
        rowErrors.push({ row: rowNumber, field: f, value: String(row[f]), message: "Must be a number" });
      } else {
        data[f] = n;
      }
    }

    // ------ date ------
    const dob = parseDate(row.dateOfBirth);
    if (dob === "INVALID") {
      rowErrors.push({ row: rowNumber, field: "dateOfBirth", value: String(row.dateOfBirth), message: "Invalid date (use YYYY-MM-DD)" });
    } else if (dob) {
      data.dateOfBirth = dob;
    }

    // ------ collect ------
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({ rowNumber, data });
    }
  });

  // Schema-level validation: dedupe instagramHandles within the file itself
  const seen = new Set<string>();
  const filteredValid: ParsedRow[] = [];
  for (const row of valid) {
    const handle = row.data.instagramHandle as string | undefined;
    if (handle && seen.has(handle)) {
      errors.push({
        row: row.rowNumber,
        field: "instagramHandle",
        value: handle,
        message: "Duplicate Instagram handle within this file",
      });
      continue;
    }
    if (handle) seen.add(handle);
    filteredValid.push(row);
  }

  return { valid: filteredValid, errors };
}

// Sanity-check the unused variable to keep TypeScript strict mode happy
export type { ColumnDef };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _z = z;
