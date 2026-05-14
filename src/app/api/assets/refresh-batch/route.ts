import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchInstagramPostMetricsBatch,
  isBrightDataConfigured,
} from "@/lib/brightdata";
import {
  tryClaimGlobalRefresh,
  getLastGlobalRefresh,
  computeCooldownState,
  revertGlobalRefresh,
} from "@/lib/global-refresh";
import { buildAssetScopeWhere } from "@/lib/asset-scope";

export const maxDuration = 300;

const MAX_BATCH = 50;

// Per-asset cooldown — defense against same-user double clicks / tab races
// during the same global refresh. Independent of the role-level global
// cooldown which is much longer (30 min admin / 6 h user).
const PER_ASSET_COOLDOWN_MS = 5 * 60 * 1000;

type SuccessRow = {
  id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  brightDataSyncedAt: Date | null;
  updatedFields: string[];
};

type FailRow = { id: string; reason: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const role = (session.user as { role?: string }).role ?? "user";

  if (!isBrightDataConfigured()) {
    return NextResponse.json(
      { error: "Bright Data not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const assetIds = Array.isArray((body as { assetIds?: unknown })?.assetIds)
    ? ((body as { assetIds: unknown[] }).assetIds.filter(
        (x): x is string => typeof x === "string",
      ))
    : [];

  if (assetIds.length === 0) {
    return NextResponse.json({ error: "assetIds required" }, { status: 400 });
  }
  if (assetIds.length > MAX_BATCH) {
    return NextResponse.json(
      {
        error: `Batch too large. Maximum ${MAX_BATCH} assets per request — chunk client-side.`,
      },
      { status: 400 },
    );
  }

  // Global cooldown gate. If the caller's role is in cooldown, this call is
  // rejected with 423 BEFORE any Bright Data spend. If a refresh cycle has
  // already started (lastGlobalRefreshAt within cooldown), subsequent batch
  // calls of THE SAME cycle should still be allowed — we detect that by
  // checking the elapsed time: a "new cycle" claim only happens when last
  // refresh was older than cooldown.
  //
  // The atomic claim: if last refresh was older than cooldown, this call
  // SETS the timestamp (claiming a new cycle). Otherwise we proceed only if
  // we're within a recent cycle the same user can keep batching against.
  //
  // Concretely: try to claim. If claimed, this is the cycle starter.
  // If not claimed AND the existing record is "recent enough" (within the
  // batch-cycle window, default 30 min), allow this batch as a continuation.
  // If not claimed AND the existing record is older than the batch-cycle
  // window but younger than the role cooldown, this is somebody else's
  // cycle from earlier today — return 423 so we don't piggy-back.
  const BATCH_CYCLE_WINDOW_MS = 30 * 60 * 1000; // 30 min — covers a single user's full run
  const claim = await tryClaimGlobalRefresh(role, userId);
  let cycleAllowed = false;
  let cycleRecord = claim.claimed ? claim.record : claim.existing;
  if (claim.claimed) {
    cycleAllowed = true;
  } else {
    const existingAt = new Date(claim.existing.at).getTime();
    if (Date.now() - existingAt < BATCH_CYCLE_WINDOW_MS) {
      // Same cycle — allow this batch as a continuation regardless of who
      // started it. The point of the global cooldown is to gate the START
      // of a new cycle, not individual batches inside it.
      cycleAllowed = true;
    }
  }
  if (!cycleAllowed) {
    const last = await getLastGlobalRefresh();
    const state = computeCooldownState(last, role);
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

  // Scope: a non-admin caller can only refresh assets they own / are
  // assigned to. Asset IDs outside their scope are silently filtered (they
  // never make it to the toScrape array, so no Bright Data money is spent
  // on assets the user shouldn't even see).
  const scopeWhere = buildAssetScopeWhere(userId, role);
  const assets = await prisma.asset.findMany({
    where: { AND: [scopeWhere, { id: { in: assetIds } }] },
    select: {
      id: true,
      platform: true,
      contentUrl: true,
      brightDataSyncedAt: true,
    },
  });

  const updated: SuccessRow[] = [];
  const failed: FailRow[] = [];
  const skipped: FailRow[] = [];

  const perAssetCutoff = new Date(Date.now() - PER_ASSET_COOLDOWN_MS);
  const toScrape: { id: string; url: string }[] = [];
  const seenIds = new Set<string>();

  for (const a of assets) {
    seenIds.add(a.id);
    if (a.platform !== "instagram") {
      skipped.push({ id: a.id, reason: "not_instagram" });
      continue;
    }
    if (!a.contentUrl) {
      skipped.push({ id: a.id, reason: "no_content_url" });
      continue;
    }
    if (a.brightDataSyncedAt && a.brightDataSyncedAt > perAssetCutoff) {
      skipped.push({ id: a.id, reason: "cooldown" });
      continue;
    }
    toScrape.push({ id: a.id, url: a.contentUrl });
  }
  for (const id of assetIds) {
    if (!seenIds.has(id)) failed.push({ id, reason: "not_found" });
  }

  if (toScrape.length === 0) {
    return NextResponse.json({
      updated,
      failed,
      skipped,
      cycle: cycleRecord,
    });
  }

  const results = await fetchInstagramPostMetricsBatch(toScrape.map((s) => s.url));

  for (const { id, url } of toScrape) {
    const r = results.get(url);
    if (!r) {
      failed.push({ id, reason: "no_result" });
      continue;
    }
    if ("error" in r) {
      failed.push({ id, reason: r.error.message });
      continue;
    }
    const metrics = r.metrics;

    const data: Record<string, unknown> = {};
    const updatedFields: string[] = [];
    if (metrics.views !== null) {
      data.views = metrics.views;
      updatedFields.push("views");
    }
    if (metrics.likes !== null) {
      data.likes = metrics.likes;
      updatedFields.push("likes");
    }
    if (metrics.comments !== null) {
      data.comments = metrics.comments;
      updatedFields.push("comments");
    }
    if (metrics.shares !== null) {
      data.shares = metrics.shares;
      updatedFields.push("shares");
    }
    if (updatedFields.length === 0) {
      failed.push({ id, reason: "no_metrics_in_response" });
      continue;
    }
    data.brightDataSnapshot = {
      caption: metrics.caption,
      hashtags: metrics.hashtags,
      audio: metrics.audio,
      videoDurationSec: metrics.videoDurationSec,
      isPaidPartnership: metrics.isPaidPartnership,
      datePosted: metrics.datePosted,
      contentTypeLabel: metrics.contentTypeLabel,
      thumbnail: metrics.thumbnail,
      views: metrics.views,
      uniqueViews: metrics.uniqueViews,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      contentKind: metrics.contentKind,
    };
    data.brightDataSyncedAt = new Date();

    try {
      const row = await prisma.asset.update({
        where: { id },
        data,
        select: {
          id: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
          brightDataSyncedAt: true,
        },
      });
      updated.push({ ...row, updatedFields });
    } catch (e) {
      failed.push({
        id,
        reason: e instanceof Error ? `db_update_failed: ${e.message}` : "db_update_failed",
      });
    }
  }

  // If we just claimed a new global-refresh cycle AND nothing succeeded,
  // undo the claim so the user (and team) can retry immediately. Otherwise
  // a single Bright Data hiccup locks everyone out for the full cooldown.
  // Only reverts when claim.claimed === true; if this was a continuation
  // batch within an existing cycle, leave the timestamp alone.
  let cycleReverted = false;
  if (claim.claimed && updated.length === 0) {
    await revertGlobalRefresh(claim.previous);
    cycleReverted = true;
  }

  return NextResponse.json({
    updated,
    failed,
    skipped,
    cycleReverted,
    cycle: cycleRecord,
  });
}
