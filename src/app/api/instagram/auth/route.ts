import { NextResponse } from "next/server";
import { getAuthUrl, USE_META_API } from "@/lib/instagram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get("redirectUri");

  if (!redirectUri) {
    return NextResponse.json(
      { error: "redirectUri query parameter is required" },
      { status: 400 }
    );
  }

  if (!USE_META_API) {
    return NextResponse.json(
      { error: "Instagram Meta API is not configured. Set META_APP_ID and META_APP_SECRET." },
      { status: 503 }
    );
  }

  try {
    const authUrl = getAuthUrl(redirectUri);
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Instagram auth URL generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate auth URL",
      },
      { status: 500 }
    );
  }
}
