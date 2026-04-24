/**
 * Influenzer /analytics/profile client — rich profile deep-dive.
 *
 * POST /api/analytics/profile
 * Body: { username, platform, unlock }
 *
 * Returns audience demographics (gender %, country %, age groups) and,
 * when available, reel view history.
 *
 * IMPORTANT: This endpoint has a SEPARATE quota from filter-search credits.
 * Our test account currently returns 429 "Your agency has exceeded limit to
 * create profilereport" — surface this clearly to the UI.
 */

import { influenzerFetch, InfluenzerError } from "./auth";
import type { CreatorDetailResponse, Platform } from "../types";

// ============================================================
// Response shape (partial — only fields we consume)
// ============================================================

interface RawInsights {
  username?: string;
  fullname?: string;
  picture?: string;
  bio?: string;
  followers?: number;
  following?: number;
  engagements?: number;
  engagement_rate?: number;
  posts?: number;
  is_verified?: boolean;
  isVerified?: boolean;
}

interface RawAudience {
  gender?: { male?: number; female?: number };
  age_groups?: Record<string, number>;
  top_countries?: Array<{ country: string; percentage: number }>;
  top_cities?: Array<{ city: string; percentage: number }>;
}

interface RawReels {
  avg_views?: number;
  median_views?: number;
  last_8_views?: number[];
  // Some responses embed a posts array
  posts?: Array<{ views?: number; videoViews?: number; play_count?: number }>;
}

interface RawProfileReport {
  audience?: RawAudience;
  reels?: RawReels;
}

interface ProfileResponse {
  success?: boolean;
  message?: string;
  result?: {
    insights?: Record<string, RawInsights>;
    reports?: Record<string, RawProfileReport>;
    balance?: number;
  };
}

// ============================================================
// Public API
// ============================================================

export async function fetchCreatorDetails(
  platform: Platform,
  username: string,
  opts: { unlock?: boolean } = {},
): Promise<CreatorDetailResponse> {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) {
    throw new InfluenzerError("Username is required", 400);
  }

  const res = await influenzerFetch("/api/analytics/profile", {
    method: "POST",
    body: JSON.stringify({
      username: handle,
      platform,
      unlock: opts.unlock ?? false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let apiMessage: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      apiMessage = parsed?.message;
    } catch {
      /* ignore */
    }
    throw new InfluenzerError(
      apiMessage ?? `Influenzer profile fetch failed: ${res.status}`,
      res.status,
      text.slice(0, 500),
    );
  }

  const raw = (await res.json()) as ProfileResponse & {
    success?: boolean;
    message?: string;
  };
  if (raw?.success === false) {
    throw new InfluenzerError(
      raw.message ?? "Influenzer returned success: false",
      200,
      JSON.stringify(raw).slice(0, 500),
    );
  }

  return normalize(platform, handle, raw);
}

// ============================================================
// Normalize raw → CreatorDetailResponse
// ============================================================

function normalize(
  platform: Platform,
  handle: string,
  raw: ProfileResponse,
): CreatorDetailResponse {
  const ins = raw?.result?.insights?.[platform] ?? {};
  const rep = raw?.result?.reports?.[platform] ?? {};
  const audience = rep.audience ?? {};
  const reels = rep.reels ?? {};

  // Gender → percentages. Influenzer may return 0-1 or 0-100; normalize to 0-100.
  const male = normPct(audience.gender?.male);
  const female = normPct(audience.gender?.female);

  // Age groups — object like { "18-24": 0.45, "25-34": 0.32 }
  const ageGroups = Object.entries(audience.age_groups ?? {})
    .map(([code, v]) => ({ code, pct: normPct(v) ?? 0 }))
    .sort((a, b) => b.pct - a.pct);

  const topCountries = (audience.top_countries ?? [])
    .map((x) => ({ name: x.country, pct: normPct(x.percentage) ?? 0 }))
    .sort((a, b) => b.pct - a.pct);

  const topCities = (audience.top_cities ?? [])
    .map((x) => ({ name: x.city, pct: normPct(x.percentage) ?? 0 }))
    .sort((a, b) => b.pct - a.pct);

  // Reel views — try the documented fields first, then fall back to posts[]
  const lastReelViews =
    reels.last_8_views ??
    (reels.posts ?? [])
      .map(
        (p) =>
          p.views ??
          p.videoViews ??
          p.play_count ??
          0,
      )
      .filter((v) => typeof v === "number" && v > 0)
      .slice(0, 10);

  return {
    handle: ins.username ?? handle,
    platform,
    fullname: ins.fullname ?? null,
    picture: ins.picture ?? null,
    bio: ins.bio ?? null,
    isVerified: Boolean(ins.is_verified ?? ins.isVerified),
    followers: ins.followers ?? null,
    following: ins.following ?? null,
    posts: ins.posts ?? null,
    engagements: ins.engagements ?? null,
    engagementRate: ins.engagement_rate ?? null,
    audienceGenderMale: male,
    audienceGenderFemale: female,
    audienceAgeGroups: ageGroups,
    audienceTopCountries: topCountries,
    audienceTopCities: topCities,
    avgReelViews: reels.avg_views ?? null,
    medianReelViews: reels.median_views ?? null,
    lastReelViews,
    balance: typeof raw?.result?.balance === "number" ? raw.result.balance : null,
  };
}

function normPct(v: number | undefined): number | null {
  if (typeof v !== "number") return null;
  // If value is <=1, treat as decimal fraction; else assume already a percentage
  return v <= 1 ? v * 100 : v;
}
