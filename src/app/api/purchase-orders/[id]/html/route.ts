import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadPoHtml } from "@/lib/purchase-order/render";

/**
 * Returns the PO as a printable HTML page. Useful both for browser preview
 * and as the input to the PDF route below. Auth-gated.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const html = await loadPoHtml(id);
  if (!html) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
