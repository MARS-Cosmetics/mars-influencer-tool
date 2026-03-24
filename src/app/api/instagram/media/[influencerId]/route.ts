import { NextResponse } from "next/server";
import { fetchRecentMedia } from "@/lib/instagram";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ influencerId: string }> }
) {
  const { influencerId } = await props.params;

  try {
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { igAccessToken: true, instagramHandle: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: "Influencer not found" },
        { status: 404 }
      );
    }

    if (!influencer.igAccessToken) {
      return NextResponse.json(
        { error: "Instagram account not connected. Please connect via OAuth first." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const media = await fetchRecentMedia(influencer.igAccessToken, limit);

    return NextResponse.json({
      handle: influencer.instagramHandle,
      mediaCount: media.length,
      media,
    });
  } catch (error) {
    console.error("Instagram media fetch failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Instagram media",
      },
      { status: 500 }
    );
  }
}
