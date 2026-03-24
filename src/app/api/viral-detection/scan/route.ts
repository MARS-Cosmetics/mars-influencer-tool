import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateBaseline,
  checkIfViral,
} from "@/lib/viral-detection";

export async function POST() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find all assets published in the last 7 days
    const assets = await prisma.asset.findMany({
      where: {
        publishedAt: { gte: sevenDaysAgo },
        status: "published",
      },
      select: {
        id: true,
        influencerId: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        saves: true,
        isViral: true,
        publishedAt: true,
        metricsSnapshot: true,
      },
    });

    let scanned = 0;
    let newViral = 0;
    let updated = 0;

    for (const asset of assets) {
      scanned++;

      const baseline = await calculateBaseline(asset.influencerId);
      const result = checkIfViral(asset, baseline);

      // Determine which time bucket to store metrics in
      const now = new Date();
      const publishedAt = asset.publishedAt
        ? new Date(asset.publishedAt)
        : now;
      const hoursSincePublish =
        (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

      let bucket: string;
      if (hoursSincePublish <= 24) {
        bucket = "24h";
      } else if (hoursSincePublish <= 48) {
        bucket = "48h";
      } else {
        bucket = "7d";
      }

      const currentSnapshot =
        (asset.metricsSnapshot as Record<string, unknown>) || {};
      const updatedSnapshot = {
        ...currentSnapshot,
        [bucket]: {
          views: asset.views,
          likes: asset.likes,
          comments: asset.comments,
          shares: asset.shares,
          saves: asset.saves,
          recordedAt: now.toISOString(),
        },
      };

      const updateData: Record<string, unknown> = {
        metricsSnapshot: updatedSnapshot,
      };

      if (result.isViral) {
        updateData.isViral = true;
        updateData.viralMultiplier = result.viralMultiplier;
        updateData.baselineMetrics = baseline;

        if (!asset.isViral) {
          updateData.viralDetectedAt = now;
          newViral++;
        }
      }

      if (
        asset.views !== null &&
        (asset.views > ((asset as Record<string, unknown>).peakViews as number ?? 0))
      ) {
        updateData.peakViews = asset.views;
      }

      await prisma.asset.update({
        where: { id: asset.id },
        data: updateData,
      });

      updated++;
    }

    return NextResponse.json({ scanned, newViral, updated });
  } catch (error) {
    console.error("Viral scan failed:", error);
    return NextResponse.json(
      { error: "Viral scan failed" },
      { status: 500 }
    );
  }
}
