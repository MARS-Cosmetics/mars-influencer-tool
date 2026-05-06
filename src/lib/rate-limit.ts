/**
 * Postgres-backed fixed-window rate limiter.
 *
 * Why Postgres and not Redis/Upstash:
 * - Already have Neon, no new service to provision
 * - Adds ~5-15ms to a request (one upsert)
 * - Fine for an internal CRM at ≤100 req/sec
 *
 * Algorithm: fixed window, atomic via single UPSERT.
 *   On hit:
 *     - if window expired → reset count=1
 *     - else if count >= max → DENY
 *     - else count++
 * Worst-case race condition lets 1-2 extra requests through under heavy
 * concurrency. That's fine for rate-limiting purposes.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  /** seconds until window resets (for Retry-After header) */
  retryAfter: number;
}

/**
 * Check + record a hit against the bucket. Returns whether the request
 * is allowed, how many are left in the window, and when the window resets.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const newResetAt = new Date(now.getTime() + windowSeconds * 1000);

  // Single SQL: upsert that resets if window expired, increments otherwise.
  // Returns the post-update count + reset_at.
  // Using $queryRaw for true atomicity in one round trip.
  const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>(
    Prisma.sql`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES (${key}, 1, ${newResetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.reset_at < NOW() THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at < NOW() THEN ${newResetAt}
          ELSE rate_limit_buckets.reset_at
        END
      RETURNING count, reset_at
    `,
  );

  const row = rows[0];
  if (!row) {
    // Should never happen; if it does, fail-open (don't block legit traffic on infra hiccup)
    console.error("[rate-limit] empty result for key:", key);
    return { allowed: true, remaining: max, resetAt: newResetAt, retryAfter: 0 };
  }

  const count = Number(row.count);
  const resetAt = new Date(row.reset_at);
  const allowed = count <= max;
  const remaining = Math.max(0, max - count);
  const retryAfter = allowed ? 0 : Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));

  return { allowed, remaining, resetAt, retryAfter };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Pull the client IP from a Next.js request, accounting for Vercel's
 * `x-forwarded-for` header. Returns "unknown" if nothing parseable.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Build a 429 response with standard rate-limit headers.
 */
export function rateLimitResponse(result: RateLimitResult, max: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
      },
    },
  );
}
