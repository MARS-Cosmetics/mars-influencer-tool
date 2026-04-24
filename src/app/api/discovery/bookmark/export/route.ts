/**
 * CSV export for discovery bookmarks.
 *
 * GET /api/discovery/bookmark/export
 *   ?campaignId=<uuid>     (optional — filter to one campaign)
 *   ?status=<status>       (optional — filter to one status)
 *   ?ids=<id1,id2,...>     (optional — export only these bookmarks)
 *
 * Returns text/csv with a Content-Disposition attachment header.
 */

import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookmarkStatus } from "@/generated/prisma";

interface SnapshotShape {
  fullname?: string;
  url?: string;
  followers?: number;
  engagements?: number;
  engagementRate?: number;
  isVerified?: boolean;
}

/**
 * Escape a single cell for RFC 4180 compliance + prevent CSV-formula injection.
 * - Wrap in double-quotes if the value contains comma, quote, newline, or CR.
 * - Double any internal quotes.
 * - If a STRING cell starts with =, +, -, @, tab, or CR, prefix with a single
 *   quote so Excel/Sheets don't evaluate it as a formula. This guards against
 *   malicious bio/username values like `=HYPERLINK("http://attacker/", A1)`.
 *   Numeric cells (populated by us, not user input) skip the prefix.
 */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  let s = typeof v === "string" ? v : String(v);
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId") ?? undefined;
    const statusParam = searchParams.get("status");
    const idsParam = searchParams.get("ids");

    const filterClauses: Prisma.DiscoveryBookmarkWhereInput[] = [];
    if (campaignId) filterClauses.push({ campaignId });
    if (
      statusParam &&
      Object.values(BookmarkStatus).includes(statusParam as BookmarkStatus)
    ) {
      filterClauses.push({ status: statusParam as BookmarkStatus });
    }
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (ids.length > 0) filterClauses.push({ id: { in: ids } });
    }

    // Tenancy scoping — same policy as the Discovered page
    const sessionUser = session.user as {
      id: string;
      role?: string;
      brandId?: string | null;
    };
    const tenantScope: Prisma.DiscoveryBookmarkWhereInput =
      sessionUser.role === "admin"
        ? {}
        : sessionUser.brandId
          ? { campaign: { brandId: sessionUser.brandId } }
          : { userId: sessionUser.id };
    filterClauses.push(tenantScope);

    const bookmarks = await prisma.discoveryBookmark.findMany({
      where: filterClauses.length > 0 ? { AND: filterClauses } : {},
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
    });

    const header = [
      "Username",
      "Full name",
      "Platform",
      "Profile URL",
      "Followers",
      "Engagements",
      "Engagement rate %",
      "Verified",
      "Status",
      "Campaign",
      "Brand",
      "Note",
      "Bookmarked at",
      "Status updated at",
    ];

    const rows = bookmarks.map((b) => {
      const p = (b.profileSnapshot as SnapshotShape) ?? {};
      return [
        b.username,
        p.fullname ?? "",
        b.platform,
        p.url ?? "",
        p.followers ?? "",
        p.engagements ?? "",
        typeof p.engagementRate === "number"
          ? (p.engagementRate * 100).toFixed(2)
          : "",
        p.isVerified ? "yes" : "no",
        b.status,
        b.campaign?.name ?? "",
        b.campaign?.brand?.name ?? "",
        b.note ?? "",
        b.createdAt.toISOString(),
        b.statusUpdatedAt?.toISOString() ?? "",
      ];
    });

    // Prepend a UTF-8 BOM so Excel detects encoding correctly.
    const csv =
      "\uFEFF" +
      [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `discovered-creators-${stamp}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[/api/discovery/bookmark/export] error:", error);
    return new Response("Failed to export", { status: 500 });
  }
}
