import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { loadPoHtml } from "@/lib/purchase-order/render";

// Force Node runtime — puppeteer needs filesystem + Chromium child process.
export const runtime = "nodejs";

/**
 * Returns the PO as a PDF. Auth-gated.
 *
 * Implementation: render HTML → spin up headless Chromium via puppeteer →
 * print to PDF buffer → stream back. PDF is NOT cached on disk; regenerated
 * on every request. Trade-off: slightly slower than serving a static file
 * (~600-1200ms cold start), but always reflects the live DB row and avoids
 * stale-file invalidation headaches.
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

  const [html, po] = await Promise.all([
    loadPoHtml(id),
    prisma.purchaseOrder.findUnique({
      where: { id },
      select: { poNumber: true, vendorNameSnapshot: true },
    }),
  ]);
  if (!html || !po) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Lazy-import puppeteer so the module isn't pulled into edge bundles or
  // the API surface for routes that don't need it.
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({
      format: "A4",
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      printBackground: true,
    });

    const safeFilename = `${po.poNumber.replace(/[\/]/g, "-")}-${po.vendorNameSnapshot.replace(/[^A-Z0-9]+/gi, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
