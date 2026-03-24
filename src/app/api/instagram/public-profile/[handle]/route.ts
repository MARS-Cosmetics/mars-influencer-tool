import { NextResponse } from "next/server";
import { fetchPublicProfile } from "@/lib/instagram";

export async function GET(
  request: Request,
  props: { params: Promise<{ handle: string }> }
) {
  const { handle } = await props.params;

  try {
    const profile = await fetchPublicProfile(handle);

    return NextResponse.json({
      found: true,
      ...profile,
    });
  } catch (error) {
    console.error("Instagram public profile fetch failed:", error);
    return NextResponse.json(
      {
        found: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Instagram profile",
      },
      { status: 500 }
    );
  }
}
