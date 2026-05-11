import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchInstagramPostMetrics,
  isBrightDataConfigured,
  BrightDataError,
} from "@/lib/brightdata";

/**
 * Refresh the per-post metrics (views / likes / comments / shares) for an
 * Instagram post or reel asset by scraping it through Bright Data.
 *
 * Independent from /refresh-metrics which uses CreatorX/Influenzer for the
 * influencer-level profile data. Deleting this file (and the brightdata lib)
 * fully reverts the integration without touching any existing code path.
 */
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBrightDataConfigured()) {
    return NextResponse.json(
      {
        error:
          "Bright Data not configured. Set BRIGHTDATA_API_TOKEN, BRIGHTDATA_IG_POST_DATASET_ID, BRIGHTDATA_IG_REEL_DATASET_ID.",
      },
      { status: 503 },
    );
  }

  const { id } = await props.params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, platform: true, contentUrl: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (asset.platform !== "instagram") {
    return NextResponse.json(
      { error: "Bright Data refresh currently supports Instagram only" },
      { status: 400 },
    );
  }

  if (!asset.contentUrl) {
    return NextResponse.json(
      { error: "Asset has no contentUrl to scrape" },
      { status: 400 },
    );
  }

  try {
    const metrics = await fetchInstagramPostMetrics(asset.contentUrl);

    // Only overwrite numeric fields Bright Data actually returned. Manually
    // entered values stay intact when the scraper returns null for a metric.
    const data: Record<string, unknown> = {};
    if (metrics.views !== null) data.views = metrics.views;
    if (metrics.likes !== null) data.likes = metrics.likes;
    if (metrics.comments !== null) data.comments = metrics.comments;
    if (metrics.shares !== null) data.shares = metrics.shares;

    // Persist the extras (caption, hashtags, audio, duration, etc.) as a
    // snapshot. Whole object overwritten each refresh — last scrape wins.
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

    const updated = await prisma.asset.update({
      where: { id: asset.id },
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

    const updatedNumeric = ["views", "likes", "comments", "shares"].filter(
      (k) => k in data,
    );

    return NextResponse.json({
      source: "brightdata",
      contentKind: metrics.contentKind,
      updatedFields: updatedNumeric,
      asset: updated,
      // When nothing numeric got mapped, return the raw Bright Data row so the
      // field names can be inspected and the picker in brightdata.ts adjusted.
      ...(updatedNumeric.length === 0 ? { rawSample: metrics.raw } : {}),
    });
  } catch (err) {
    if (err instanceof BrightDataError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error("Bright Data refresh failed:", err);
    return NextResponse.json(
      { error: "Bright Data refresh failed" },
      { status: 500 },
    );
  }
}
