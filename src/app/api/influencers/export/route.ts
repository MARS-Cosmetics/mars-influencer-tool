import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, InfluencerTier, InfluencerStatus } from "@/generated/prisma";
import { buildExportXlsx, buildExportCsv, EXPORT_PRISMA_SELECT } from "@/lib/influencer-export";

export const runtime = "nodejs";

const MAX_EXPORT_ROWS = 10_000; // protect against unintentionally huge exports

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const format = (sp.get("format") ?? "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "csv") {
    return NextResponse.json(
      { error: "Unsupported format. Use ?format=xlsx or ?format=csv" },
      { status: 400 },
    );
  }

  // Build the same WHERE clause the influencers list page uses.
  // Pass scope=all to ignore filters and export everything.
  const scope = sp.get("scope");
  const where: Prisma.InfluencerWhereInput = {};
  if (scope !== "all") {
    const search = sp.get("search") ?? "";
    const tier = sp.get("tier") ?? "";
    const status = sp.get("status") ?? "";
    const state = sp.get("state") ?? "";
    const city = sp.get("city") ?? "";

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { instagramHandle: { contains: search, mode: "insensitive" } },
      ];
    }
    if (tier) where.tier = tier as InfluencerTier;
    if (status) where.status = status as InfluencerStatus;
    if (state) where.state = { contains: state, mode: "insensitive" };
    if (city) where.city = { contains: city, mode: "insensitive" };
  }

  // Count first to enforce the cap cleanly with a clear error
  const total = await prisma.influencer.count({ where });
  if (total > MAX_EXPORT_ROWS) {
    return NextResponse.json(
      {
        error: `Export too large: ${total} rows match. Maximum is ${MAX_EXPORT_ROWS}. Apply filters to narrow it down.`,
      },
      { status: 400 },
    );
  }

  const rows = await prisma.influencer.findMany({
    where,
    select: EXPORT_PRISMA_SELECT,
    orderBy: { createdAt: "desc" },
    take: MAX_EXPORT_ROWS,
  });

  const ts = new Date().toISOString().slice(0, 10);
  const scopeTag = scope === "all" ? "all" : "filtered";
  const filenameBase = `influencers-${scopeTag}-${ts}`;

  if (format === "csv") {
    const body = buildExportCsv(rows as unknown as Record<string, unknown>[]);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // xlsx
  const buf = buildExportXlsx(rows as unknown as Record<string, unknown>[]);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
