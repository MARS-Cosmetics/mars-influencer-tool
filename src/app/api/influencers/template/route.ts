import { NextRequest, NextResponse } from "next/server";
import { buildTemplateXlsx, buildTemplateCsv } from "@/lib/influencer-bulk-import";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ?? "xlsx").toLowerCase();

  if (format === "csv") {
    const body = buildTemplateCsv();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="influencer-import-template.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "xlsx") {
    const buf = buildTemplateXlsx();
    const body = new Uint8Array(buf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="influencer-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { error: "Unsupported format. Use ?format=xlsx or ?format=csv" },
    { status: 400 },
  );
}
