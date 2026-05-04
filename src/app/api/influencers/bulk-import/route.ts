import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { parseUpload, validateAndNormalize, type RowError } from "@/lib/influencer-bulk-import";

export const runtime = "nodejs";

const MAX_ROWS = 1000;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded (expected 'file' field)" }, { status: 400 });
  }

  const filename = file.name || "upload.xlsx";
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
    return NextResponse.json({ error: "Only .xlsx, .xls, or .csv files are accepted" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch {
    return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 400 });
  }

  // Parse
  let rawRows: Record<string, unknown>[];
  try {
    rawRows = parseUpload(buffer, filename);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not parse file";
    return NextResponse.json({ error: `Parse error: ${msg}` }, { status: 400 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rawRows.length}). Maximum is ${MAX_ROWS} per file. Split your file and try again.` },
      { status: 400 },
    );
  }

  // Validate + normalize
  const { valid, errors: validationErrors } = validateAndNormalize(rawRows);
  const errors: RowError[] = [...validationErrors];

  // Find handles already in DB → mark as duplicates (skip)
  const handlesInFile = valid
    .map((v) => v.data.instagramHandle as string | undefined)
    .filter((h): h is string => !!h);

  let existingHandles = new Set<string>();
  if (handlesInFile.length > 0) {
    const existing = await prisma.influencer.findMany({
      where: { instagramHandle: { in: handlesInFile } },
      select: { instagramHandle: true },
    });
    existingHandles = new Set(
      existing.map((e) => e.instagramHandle).filter((h): h is string => !!h),
    );
  }

  const skippedDuplicates: { row: number; instagramHandle: string }[] = [];
  const toInsert: Prisma.InfluencerCreateManyInput[] = [];
  for (const row of valid) {
    const h = row.data.instagramHandle as string | undefined;
    if (h && existingHandles.has(h)) {
      skippedDuplicates.push({ row: row.rowNumber, instagramHandle: h });
      continue;
    }
    toInsert.push(row.data as Prisma.InfluencerCreateManyInput);
  }

  // Bulk insert
  let createdCount = 0;
  if (toInsert.length > 0) {
    try {
      const result = await prisma.influencer.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      createdCount = result.count;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "DB insert failed";
      return NextResponse.json(
        {
          error: `Database insert failed: ${msg}`,
          partial: { created: 0, errors, skippedDuplicates },
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    summary: {
      totalRowsInFile: rawRows.length,
      created: createdCount,
      skippedDuplicates: skippedDuplicates.length,
      errorRows: errors.length,
    },
    errors,
    skippedDuplicates,
  });
}
