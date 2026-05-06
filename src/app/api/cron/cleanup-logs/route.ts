/**
 * Scheduled job — deletes old ActivityLog rows.
 *
 * Tiered retention:
 *   • Financial / KYC / legal entities → 1 year (compliance-friendly)
 *       payment, invoice, contract, document, agency (delete events)
 *   • Everything else → 7 days
 *
 * Triggered by Vercel Cron once a day. Auth via shared CRON_SECRET header
 * to keep the endpoint locked down even though it's `/api/*`.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Long-retention entities (1 year)
const FINANCIAL_ENTITIES = [
  "payment",
  "invoice",
  "contract",
  "document",
] as const;

const SHORT_DAYS = 7;
const LONG_DAYS = 365;

export async function GET(request: NextRequest) {
  // Vercel Cron sends an Authorization header with our CRON_SECRET.
  // Reject anything else.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const sevenDaysAgo = new Date(now - SHORT_DAYS * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now - LONG_DAYS * 24 * 60 * 60 * 1000);

  try {
    // Delete short-retention rows older than 7 days
    const shortResult = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        entityType: { notIn: [...FINANCIAL_ENTITIES] },
      },
    });

    // Delete long-retention rows older than 1 year
    const longResult = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: oneYearAgo },
        entityType: { in: [...FINANCIAL_ENTITIES] },
      },
    });

    // Document access log uses a separate table — also clean its old rows
    const accessLogResult = await prisma.documentAccessLog.deleteMany({
      where: { accessedAt: { lt: oneYearAgo } },
    });

    // Rate-limit buckets — purge anything with an expired window
    const rateLimitResult = await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date() } },
    });

    return NextResponse.json({
      ok: true,
      deletedAt: new Date().toISOString(),
      activityLog: {
        shortRetentionDeleted: shortResult.count,
        longRetentionDeleted: longResult.count,
      },
      documentAccessLog: {
        deleted: accessLogResult.count,
      },
      rateLimitBuckets: {
        deleted: rateLimitResult.count,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "cleanup failed";
    console.error("[cron/cleanup-logs] failed:", message);

    // Still return success-shaped JSON if it's a known transient error,
    // otherwise 500. Vercel Cron retries on 5xx.
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "DB error", code: e.code }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
