/**
 * CreatorX / Influenzer.ai API client
 *
 * Server-side only. Never import this from a "use client" file.
 *
 * Auth flow: POST /api/authentication/login with {email, password, account_type}
 * → returns a Firebase ID token (Bearer), ~1h lifetime. Token is cached in memory
 * and refreshed on 401.
 *
 * Public API:
 *   isCreatorXConfigured()  → true when env vars are set
 *   fetchProfile(handle)    → NormalizedProfile | null (same shape as culturex.ts)
 */

import type { NormalizedProfile } from "@/lib/culturex";

const BASE_URL = process.env.CREATORX_BASE_URL || "https://server-test-2.influenzer.ai";
const EMAIL = process.env.CREATORX_EMAIL;
const PASSWORD = process.env.CREATORX_PASSWORD;
const ACCOUNT_TYPE = (process.env.CREATORX_ACCOUNT_TYPE || "agency") as "agency" | "creator" | "brand";
const UNLOCK = process.env.CREATORX_UNLOCK === "true";
const FETCH_TIMEOUT_MS = 10_000;
// Firebase ID tokens last 1h. Refresh a bit early.
const TOKEN_TTL_MS = 55 * 60 * 1000;

export function isCreatorXConfigured(): boolean {
  return Boolean(EMAIL && PASSWORD);
}

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;
let inflightLogin: Promise<string> | null = null;

async function login(): Promise<string> {
  if (!EMAIL || !PASSWORD) {
    throw new Error("CreatorX not configured: set CREATORX_EMAIL and CREATORX_PASSWORD");
  }

  const res = await fetch(`${BASE_URL}/api/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, account_type: ACCOUNT_TYPE }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CreatorX login failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { success?: boolean; data?: { token?: string } };
  const token = data?.data?.token;
  if (!token) throw new Error("CreatorX login response missing token");

  cached = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  if (inflightLogin) return inflightLogin;
  inflightLogin = login().finally(() => {
    inflightLogin = null;
  });
  return inflightLogin;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const attempt = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  };

  let token = await getToken();
  let res = await attempt(token);
  if (res.status === 401) {
    cached = null;
    token = await getToken();
    res = await attempt(token);
  }
  return res;
}

// ============================================================
// Response types (partial — only what we use)
// ============================================================

interface CreatorXProfileInsights {
  username?: string;
  fullname?: string;
  picture?: string;
  followers?: number;
  following?: number;
  engagements?: number;
  engagement_rate?: number;
  posts?: number;
  bio?: string;
}

interface CreatorXAudienceReport {
  audience?: {
    gender?: { male?: number; female?: number };
    age_groups?: Record<string, number>;
    top_countries?: Array<{ country: string; percentage: number }>;
    top_cities?: Array<{ city: string; percentage: number }>;
  };
}

interface CreatorXProfileResponse {
  success?: boolean;
  message?: string;
  result?: {
    insights?: Record<string, CreatorXProfileInsights>;
    reports?: Record<string, CreatorXAudienceReport>;
    balance?: number;
    unlock_status?: boolean;
  };
}

function tierFromFollowers(n: number): string {
  if (n < 10_000) return "nano";
  if (n < 50_000) return "micro";
  if (n < 200_000) return "mid";
  if (n < 1_000_000) return "macro";
  return "mega";
}

function topAgeRange(groups: Record<string, number> | undefined): string | null {
  if (!groups) return null;
  const entries = Object.entries(groups);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function percentageMap(
  arr: Array<{ country?: string; city?: string; percentage: number }> | undefined,
  key: "country" | "city",
): Record<string, number> | null {
  if (!arr || arr.length === 0) return null;
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = (item as Record<string, unknown>)[key];
    if (typeof k === "string") out[k] = item.percentage;
  }
  return Object.keys(out).length ? out : null;
}

// ============================================================
// Public API
// ============================================================

export type CreatorXPlatform = "instagram" | "youtube" | "tiktok" | "facebook";

export async function fetchProfile(
  handle: string,
  platform: CreatorXPlatform = "instagram",
): Promise<NormalizedProfile | null> {
  if (!isCreatorXConfigured()) return null;

  const username = handle.replace(/^@/, "").trim();
  if (!username) return null;

  try {
    const res = await apiFetch("/api/analytics/profile", {
      method: "POST",
      body: JSON.stringify({ username, platform, unlock: UNLOCK }),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`CreatorX /profile error ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const body = (await res.json()) as CreatorXProfileResponse;
    const insights = body?.result?.insights?.[platform];
    const report = body?.result?.reports?.[platform];
    if (!insights) return null;

    const followers = insights.followers ?? 0;

    const normalized: NormalizedProfile = {
      found: true,
      // NormalizedProfile.source is a union; we extend it via module augmentation below.
      source: "creatorx" as NormalizedProfile["source"],
      handle: insights.username || username,
      name: insights.fullname || username,
      bio: insights.bio || null,
      profileImageUrl: insights.picture || null,
      email: null,
      phone: null,
      isVerified: false,
      category: null,
      igFollowerCount: followers,
      igFollowingCount: insights.following ?? 0,
      igPostCount: insights.posts ?? 0,
      igEngagementRate:
        typeof insights.engagement_rate === "number" ? insights.engagement_rate : null,
      igAvgLikes: null,
      igAvgComments: null,
      igAvgReelViews: null,
      igAvgStoryViews: null,
      igMedianReelViews: null,
      igLast8ReelViews: [],
      igCredibilityScore: null,
      igAudienceMalePct: report?.audience?.gender?.male ?? null,
      igAudienceFemalePct: report?.audience?.gender?.female ?? null,
      igAudienceTopAgeRange: topAgeRange(report?.audience?.age_groups),
      igAudienceTopCities: percentageMap(report?.audience?.top_cities, "city"),
      igAudienceTopCountries: percentageMap(report?.audience?.top_countries, "country"),
      categories: [],
      tier: tierFromFollowers(followers),
      avgVideoDuration: null,
      avgReshareCount: null,
      popularPostingDays: null,
      avgPostPerWeek: null,
      recentReels: [],
      lastUpdated: null,
    };

    return normalized;
  } catch (err) {
    console.error("CreatorX fetchProfile failed:", err);
    return null;
  }
}
