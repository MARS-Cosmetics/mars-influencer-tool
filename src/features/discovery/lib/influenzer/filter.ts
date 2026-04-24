/**
 * Influenzer Filter API client — creator search endpoint only.
 *
 * POST /api/analytics/{platform}/search/filter
 *
 * Each successful search deducts credits. Errors surface as InfluenzerError
 * with the HTTP status attached so the route handler can map them (403 →
 * out-of-credits → 402 to our client, etc.).
 */

import { influenzerFetch, InfluenzerError } from "./auth";
import type { Platform, CreatorResult, SearchResponse } from "../types";
import type { InfluenzerFilterRequest } from "./schema";

// ============================================================
// Response types (partial — only fields we consume)
// ============================================================

interface RawCreatorProfile {
  engagementRate?: number;
  engagements?: number;
  followers?: number;
  fullname?: string;
  url?: string;
  username?: string;
  isVerified?: boolean;
  picture?: string;
  isPrivate?: boolean;
}

interface RawCreatorHit {
  userId: string;
  profile: RawCreatorProfile;
}

interface FilterRawResponse {
  success?: boolean;
  result?: {
    error?: boolean;
    total?: number;
    directs?: RawCreatorHit[];
    lookalikes?: RawCreatorHit[];
  };
  balance?: number;
  pagination?: {
    hasNextPage?: boolean;
    total?: number;
    totalPages?: number;
    currentPage?: number;
    nextPage?: number | null;
  };
}

// ============================================================
// Public API
// ============================================================

export async function filterCreators(
  platform: Platform,
  body: InfluenzerFilterRequest,
): Promise<SearchResponse> {
  const res = await influenzerFetch(
    `/api/analytics/${platform}/search/filter`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Try to extract the API's "message" field so we can surface the real reason
    let apiMessage: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      apiMessage = parsed?.message;
    } catch {
      /* ignore */
    }
    throw new InfluenzerError(
      apiMessage ?? `Influenzer filter search failed: ${res.status}`,
      res.status,
      text.slice(0, 500),
    );
  }

  const raw = (await res.json()) as FilterRawResponse & {
    success?: boolean;
    message?: string;
  };

  // Influenzer sometimes returns HTTP 200 with `success: false` + a
  // "message" like "Invalid fields". Treat that as a real error — otherwise
  // the UI silently shows "no results" when the filter was actually rejected.
  if (raw?.success === false) {
    throw new InfluenzerError(
      raw.message ?? "Influenzer returned success: false",
      200,
      JSON.stringify(raw).slice(0, 500),
    );
  }

  // Merge directs + lookalikes — API returns both, we show both.
  const hits: RawCreatorHit[] = [
    ...(raw?.result?.directs ?? []),
    ...(raw?.result?.lookalikes ?? []),
  ];

  const creators: CreatorResult[] = hits.map((h) => ({
    userId: h.userId,
    username: h.profile?.username ?? "",
    fullname: h.profile?.fullname ?? "",
    url: h.profile?.url ?? "",
    picture: h.profile?.picture ?? null,
    isVerified: Boolean(h.profile?.isVerified),
    isPrivate: Boolean(h.profile?.isPrivate),
    followers: h.profile?.followers ?? 0,
    engagements: h.profile?.engagements ?? 0,
    engagementRate: h.profile?.engagementRate ?? 0,
  }));

  return {
    total: raw?.result?.total ?? creators.length,
    creators,
    pagination: {
      hasNextPage: raw?.pagination?.hasNextPage ?? false,
      currentPage: raw?.pagination?.currentPage ?? 0,
      nextPage: raw?.pagination?.nextPage ?? null,
      totalPages: raw?.pagination?.totalPages ?? 1,
    },
    balance: typeof raw?.balance === "number" ? raw.balance : null,
  };
}
