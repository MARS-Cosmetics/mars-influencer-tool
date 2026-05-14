import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getLastGlobalRefresh,
  computeCooldownState,
  MAX_ASSET_AGE_DAYS,
} from "@/lib/global-refresh";
import { buildAssetScopeWhere } from "@/lib/asset-scope";

// Returns the list of Instagram asset IDs to refresh on a "Refresh metrics"
// click. Global scope: every IG asset with a contentUrl (not window-scoped).
// Excludes assets older than MAX_ASSET_AGE_DAYS if set (cost knob).
//
// Read-only. Does NOT claim the global refresh slot — that happens in
// /api/assets/refresh-batch atomically so the click only "spends" the slot
// if the user actually confirms.
//
// Returns 423 Locked if the caller's role is still in cooldown, with the
// timestamps the UI can render.

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "user";

  const last = await getLastGlobalRefresh();
  const state = computeCooldownState(last, role);

  if (!state.canRefresh) {
    return NextResponse.json(
      {
        cooldownActive: true,
        role,
        lastRefreshAt: state.lastRefreshAt,
        nextAllowedAt: state.nextAllowedAt,
        cooldownLabel: state.cooldownLabel,
        triggeredBy: last
          ? { userId: last.byUserId, role: last.byUserRole }
          : null,
      },
      { status: 423 },
    );
  }

  const url = new URL(request.url);
  const limit = clampInt(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);

  const scopeWhere = buildAssetScopeWhere(session.user.id, role);
  const where: Record<string, unknown> = {
    ...scopeWhere,
    platform: "instagram",
    contentUrl: { not: null },
  };
  if (MAX_ASSET_AGE_DAYS !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_ASSET_AGE_DAYS);
    where.publishedAt = { gte: cutoff };
  }

  const assets = await prisma.asset.findMany({
    where,
    select: { id: true },
    orderBy: [
      // Never-refreshed first, then oldest-refresh first. Means a partial
      // run still prioritizes the data most likely to be stale.
      { brightDataSyncedAt: { sort: "asc", nulls: "first" } },
      { publishedAt: "desc" },
    ],
    take: limit,
  });

  const totalCandidates = await prisma.asset.count({ where });

  return NextResponse.json({
    cooldownActive: false,
    role,
    ids: assets.map((a) => a.id),
    totalCandidates,
    returned: assets.length,
    cap: limit,
    lastRefreshAt: state.lastRefreshAt,
    maxAssetAgeDays: MAX_ASSET_AGE_DAYS,
  });
}

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
