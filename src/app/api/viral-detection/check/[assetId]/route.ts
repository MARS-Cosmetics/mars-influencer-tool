import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateBaseline,
  checkIfViral,
  calculateEarnedMediaValue,
} from "@/lib/viral-detection";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        influencerId: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        saves: true,
        isViral: true,
        viralMultiplier: true,
        viralDetectedAt: true,
        platform: true,
        contentType: true,
        publishedAt: true,
        influencer: {
          select: { id: true, name: true, instagramHandle: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const baseline = await calculateBaseline(asset.influencerId);
    const viralCheck = checkIfViral(asset, baseline);
    const earnedMediaValue = calculateEarnedMediaValue(asset);

    return NextResponse.json({
      asset: {
        id: asset.id,
        platform: asset.platform,
        contentType: asset.contentType,
        publishedAt: asset.publishedAt,
        influencer: asset.influencer,
      },
      metrics: {
        views: asset.views,
        likes: asset.likes,
        comments: asset.comments,
        shares: asset.shares,
        saves: asset.saves,
      },
      baseline,
      viralCheck,
      earnedMediaValue,
      currentStatus: {
        isViral: asset.isViral,
        viralMultiplier: asset.viralMultiplier
          ? Number(asset.viralMultiplier)
          : null,
        viralDetectedAt: asset.viralDetectedAt,
      },
    });
  } catch (error) {
    console.error("Viral check failed:", error);
    return NextResponse.json(
      { error: "Viral check failed" },
      { status: 500 }
    );
  }
}
