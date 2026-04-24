import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  runDiscoverySearch,
  SearchRequestSchema,
  SearchServiceError,
} from "@/features/discovery/lib/searchService";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = SearchRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await runDiscoverySearch({
      userId: session.user.id as string,
      request: parsed.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SearchServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[/api/discovery/search] unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
