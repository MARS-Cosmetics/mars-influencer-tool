import { NextResponse } from "next/server";
import { exchangeCodeForToken, fetchConnectedProfile } from "@/lib/instagram";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const influencerId = searchParams.get("state"); // We pass influencerId as state param
  const error = searchParams.get("error");

  if (error) {
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        `/influencers${influencerId ? `/${influencerId}` : ""}?ig_error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code is required" },
      { status: 400 }
    );
  }

  if (!influencerId) {
    return NextResponse.json(
      { error: "Influencer ID (state) is required" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = new URL(request.url);
    const redirectUri = `${baseUrl.origin}/api/instagram/callback`;

    const { accessToken, userId } = await exchangeCodeForToken(
      code,
      redirectUri
    );

    // Fetch connected profile to get Instagram user ID
    const profile = await fetchConnectedProfile(accessToken);

    // Store access token and Instagram ID on the influencer record
    await prisma.influencer.update({
      where: { id: influencerId },
      data: {
        igAccessToken: accessToken,
        instagramId: profile.id || userId,
        igFollowerCount: profile.followerCount,
        igFollowingCount: profile.followingCount,
        igPostCount: profile.mediaCount,
        metricsLastSyncedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL(
        `/influencers/${influencerId}?ig_connected=true`,
        request.url
      )
    );
  } catch (err) {
    console.error("Instagram OAuth callback failed:", err);
    return NextResponse.redirect(
      new URL(
        `/influencers/${influencerId}?ig_error=${encodeURIComponent("Failed to connect Instagram")}`,
        request.url
      )
    );
  }
}
