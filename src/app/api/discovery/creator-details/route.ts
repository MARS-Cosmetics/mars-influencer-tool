import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { fetchCreatorDetails } from "@/features/discovery/lib/influenzer/profile";
import { InfluenzerError } from "@/features/discovery/lib/influenzer/auth";
import { PlatformEnum } from "@/features/discovery/lib/influenzer/schema";

const BodySchema = z.object({
  platform: PlatformEnum,
  username: z.string().min(1),
  unlock: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const details = await fetchCreatorDetails(
      parsed.data.platform,
      parsed.data.username,
      { unlock: parsed.data.unlock },
    );

    return NextResponse.json(details);
  } catch (err) {
    if (err instanceof InfluenzerError) {
      // 429 = quota exceeded on /analytics/profile (separate from filter credits)
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "Influenzer profile-report quota exhausted. This is separate from search credits — contact Influenzer to raise or reset it.",
            code: "PROFILE_QUOTA_EXCEEDED",
          },
          { status: 429 },
        );
      }
      // 403 = no subscription / endpoint not enabled
      if (err.status === 403) {
        return NextResponse.json(
          { error: err.message, code: "NOT_ENTITLED" },
          { status: 402 },
        );
      }
      // 404 = creator not in index
      if (err.status === 404) {
        return NextResponse.json(
          { error: "Creator not found in Influenzer's index" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: err.message },
        { status: err.status === 401 ? 500 : err.status },
      );
    }
    console.error("[/api/discovery/creator-details] unexpected:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
