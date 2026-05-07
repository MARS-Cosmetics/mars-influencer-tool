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

// Influenzer's actual response uses different keys than the API doc
// suggests. Empirically (verified on server-test-2 with @meenasagar16):
//   insights:    follower (singular), totalContent, name, profilePicture, verified
//   reports:     avgLikes, avgComments, avgReelsPlays, recentReels, popularReels
//   audience:    genders [array of {code,weight}], ages, geoCountries, geoCities
// We accept both new + legacy shapes so the same code works against any
// future shape change Influenzer might make.
interface RawInsights {
  username?: string;
  // headline-name: real key is `name`; some shapes use `fullname`
  name?: string;
  fullname?: string;
  // picture: real key is `profilePicture`
  profilePicture?: string;
  picture?: string;
  bio?: string;
  // follower count: real key is `follower` (singular!)
  follower?: number;
  followers?: number;
  following?: number;
  engagements?: number;
  engagement_rate?: number;
  // posts count: real key is `totalContent`
  totalContent?: number;
  totalLikes?: number;
  totalComment?: number;
  posts?: number;
  // verified: real key is `verified`
  verified?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
}

interface RawAudienceGenderEntry {
  code?: string; // "MALE" | "FEMALE"
  weight?: number;
}
interface RawAudienceAgeEntry {
  code?: string; // "18-24" | "25-34" | ...
  weight?: number;
}
interface RawAudienceGeoEntry {
  id?: number;
  name?: string;
  weight?: number;
  country?: string | { name?: string };
}

interface RawAudience {
  // Real shape: genders[].code === "MALE"|"FEMALE", weight is 0-1
  genders?: RawAudienceGenderEntry[];
  ages?: RawAudienceAgeEntry[];
  geoCountries?: RawAudienceGeoEntry[];
  geoCities?: RawAudienceGeoEntry[];
  credibility?: number;
  // Legacy/fallback shapes (kept for safety if API changes back)
  gender?: { male?: number; female?: number };
  age_groups?: Record<string, number>;
  top_countries?: Array<{ country: string; percentage: number }>;
  top_cities?: Array<{ city: string; percentage: number }>;
}

interface RawReels {
  avg_views?: number;
  median_views?: number;
  last_8_views?: number[];
  posts?: Array<{ views?: number; videoViews?: number; play_count?: number }>;
}

interface RawRecentReel {
  views?: number;
  play_count?: number;
  videoViews?: number;
}

interface RawProfileReport {
  audience?: RawAudience;
  reels?: RawReels;
  // Real keys: report.avgLikes, report.avgComments, report.avgReelsPlays
  avgLikes?: number;
  avgComments?: number;
  avgReelsPlays?: number;
  recentReels?: RawRecentReel[];
  popularReels?: RawRecentReel[];
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

  // DIAGNOSTIC: log the raw payload so we can see what keys Influenzer
  // actually returns vs what our parser is looking for. Drop this once
  // the audience-parsing path is confirmed correct for production server.
  const ins = raw?.result?.insights?.[platform] as Record<string, unknown> | undefined;
  const rep = raw?.result?.reports?.[platform] as Record<string, unknown> | undefined;
  const aud = (rep?.audience ?? null) as Record<string, unknown> | null;
  console.log("[influenzer/profile] RAW RESPONSE for", handle, {
    top_keys: Object.keys(raw?.result ?? {}),
    insights_keys: ins ? Object.keys(ins) : null,
    reports_keys: rep ? Object.keys(rep) : null,
    audience_keys: aud ? Object.keys(aud) : null,
    audience_preview: aud ? JSON.stringify(aud).slice(0, 1500) : null,
    full_payload_preview: JSON.stringify(raw).slice(0, 4000),
  });

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

  // Gender — real shape is `audience.genders: [{code:"MALE",weight:0.59}, ...]`.
  // Old code looked for `audience.gender.male/female` (singular, nested) which
  // never existed. Try new shape first, fall back to old.
  const genderArr = audience.genders ?? [];
  const maleEntry = genderArr.find((g) => g.code?.toUpperCase() === "MALE");
  const femaleEntry = genderArr.find((g) => g.code?.toUpperCase() === "FEMALE");
  const male = normPct(maleEntry?.weight) ?? normPct(audience.gender?.male);
  const female =
    normPct(femaleEntry?.weight) ?? normPct(audience.gender?.female);

  // Ages — real shape is `audience.ages: [{code:"18-24",weight:0.45}, ...]`.
  // Old shape was an object map. Handle both.
  let ageGroups: Array<{ code: string; pct: number }> = [];
  if (Array.isArray(audience.ages)) {
    ageGroups = audience.ages
      .filter((a) => typeof a.code === "string")
      .map((a) => ({ code: a.code as string, pct: normPct(a.weight) ?? 0 }))
      .sort((a, b) => b.pct - a.pct);
  } else if (audience.age_groups) {
    ageGroups = Object.entries(audience.age_groups)
      .map(([code, v]) => ({ code, pct: normPct(v) ?? 0 }))
      .sort((a, b) => b.pct - a.pct);
  }

  // Geo — real keys are `geoCountries` / `geoCities`, each with `name` + `weight`.
  const topCountries = Array.isArray(audience.geoCountries)
    ? audience.geoCountries
        .filter((x) => typeof x.name === "string")
        .map((x) => ({ name: x.name as string, pct: normPct(x.weight) ?? 0 }))
        .sort((a, b) => b.pct - a.pct)
    : (audience.top_countries ?? [])
        .map((x) => ({ name: x.country, pct: normPct(x.percentage) ?? 0 }))
        .sort((a, b) => b.pct - a.pct);

  const topCities = Array.isArray(audience.geoCities)
    ? audience.geoCities
        .filter((x) => typeof x.name === "string")
        .map((x) => ({ name: x.name as string, pct: normPct(x.weight) ?? 0 }))
        .sort((a, b) => b.pct - a.pct)
    : (audience.top_cities ?? [])
        .map((x) => ({ name: x.city, pct: normPct(x.percentage) ?? 0 }))
        .sort((a, b) => b.pct - a.pct);

  // Reels — prefer report.recentReels[].views (real shape), fall back to
  // legacy reels.last_8_views / reels.posts.
  const recentReelsArr = rep.recentReels ?? rep.popularReels ?? [];
  const reelViewsFromRecent = recentReelsArr
    .map((r) => r.views ?? r.play_count ?? r.videoViews ?? 0)
    .filter((v) => typeof v === "number" && v > 0)
    .slice(0, 10);

  const lastReelViews =
    reels.last_8_views ??
    (reelViewsFromRecent.length > 0
      ? reelViewsFromRecent
      : (reels.posts ?? [])
          .map((p) => p.views ?? p.videoViews ?? p.play_count ?? 0)
          .filter((v) => typeof v === "number" && v > 0)
          .slice(0, 10));

  // Headline + reels: real keys are `report.avgReelsPlays`, etc.
  const avgReelViews = rep.avgReelsPlays ?? reels.avg_views ?? null;
  const medianReelViews = reels.median_views ?? null;

  // Headline counts — real keys: insights.follower (singular), totalContent,
  // name, profilePicture, verified.
  const followers = ins.follower ?? ins.followers ?? null;
  const posts = ins.totalContent ?? ins.posts ?? null;
  const fullname = ins.name ?? ins.fullname ?? null;
  const picture = ins.profilePicture ?? ins.picture ?? null;
  const isVerified = Boolean(ins.verified ?? ins.is_verified ?? ins.isVerified);

  // Engagement rate — Influenzer doesn't return it in `insights` for many
  // profiles. Compute from avgLikes + avgComments + followers when possible.
  let engagementRate = ins.engagement_rate ?? null;
  if (engagementRate == null && followers && followers > 0) {
    const al = rep.avgLikes ?? 0;
    const ac = rep.avgComments ?? 0;
    if (al + ac > 0) {
      engagementRate = (al + ac) / followers;
    }
  }

  return {
    handle: ins.username ?? handle,
    platform,
    fullname,
    picture,
    bio: ins.bio ?? null,
    isVerified,
    followers,
    following: ins.following ?? null,
    posts,
    engagements: ins.engagements ?? null,
    engagementRate,
    audienceGenderMale: male,
    audienceGenderFemale: female,
    audienceAgeGroups: ageGroups,
    audienceTopCountries: topCountries,
    audienceTopCities: topCities,
    avgReelViews,
    medianReelViews,
    lastReelViews,
    balance: typeof raw?.result?.balance === "number" ? raw.result.balance : null,
  };
}

function normPct(v: number | undefined): number | null {
  if (typeof v !== "number") return null;
  // If value is <=1, treat as decimal fraction; else assume already a percentage
  return v <= 1 ? v * 100 : v;
}
