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

// Influenzer requires THREE auth headers per the Filter API doc:
//   Authorization: Bearer <token>
//   x-session-id:  <sessionId from login response>
//   Origin:        testing.influenzer.io
// Sending only Authorization gets rejected at session validation. The
// discover-page client (src/features/discovery/lib/influenzer/auth.ts) does
// this correctly; this client used to drop sessionId/Origin and silently fail.
type CachedAuth = { token: string; sessionId: string; expiresAt: number };
let cached: CachedAuth | null = null;
let inflightLogin: Promise<CachedAuth> | null = null;

async function login(): Promise<CachedAuth> {
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
  const data = (await res.json()) as {
    success?: boolean;
    data?: {
      token?: string;
      sessionId?: string;
      user?: { uuid?: string };
    };
  };
  const token = data?.data?.token;
  // The PDF says to use data.user.uuid for x-session-id, but in practice the
  // server returns a separate `sessionId` field that's what's actually
  // accepted. Falling back to uuid only as a last resort.
  const sessionId = data?.data?.sessionId ?? data?.data?.user?.uuid;
  if (!token || !sessionId) {
    throw new Error("CreatorX login response missing token or sessionId");
  }

  cached = { token, sessionId, expiresAt: Date.now() + TOKEN_TTL_MS };
  return cached;
}

async function getAuth(): Promise<CachedAuth> {
  if (cached && cached.expiresAt > Date.now()) return cached;
  if (inflightLogin) return inflightLogin;
  inflightLogin = login().finally(() => {
    inflightLogin = null;
  });
  return inflightLogin;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const attempt = async (auth: CachedAuth) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${auth.token}`);
    headers.set("x-session-id", auth.sessionId);
    headers.set("Origin", "testing.influenzer.io");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  };

  let auth = await getAuth();
  let res = await attempt(auth);
  if (res.status === 401) {
    cached = null;
    auth = await getAuth();
    res = await attempt(auth);
  }
  return res;
}

// ============================================================
// Response types (partial — only what we use)
// ============================================================

interface CreatorXProfileInsights {
  username?: string;
  // Real key is `name`. Old shape used `fullname`. Accept both.
  name?: string;
  fullname?: string;
  // Real key is `profilePicture`. Old shape used `picture`. Accept both.
  profilePicture?: string;
  picture?: string;
  // Real key is `follower` (singular!). Accept both.
  follower?: number;
  followers?: number;
  following?: number;
  engagements?: number;
  engagement_rate?: number;
  // Real key is `totalContent`. Accept old `posts` too.
  totalContent?: number;
  totalLikes?: number;
  totalComment?: number;
  posts?: number;
  bio?: string;
  // Real key is `verified`. Accept old too.
  verified?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  // Credibility — try every plausible spot
  credibility?: number;
  credibility_score?: number;
  audience_credibility?: number;
}

interface CreatorXAudienceReport {
  audience?: {
    // Real shape: array of {code,weight}
    genders?: Array<{ code?: string; weight?: number }>;
    ages?: Array<{ code?: string; weight?: number }>;
    geoCountries?: Array<{ name?: string; weight?: number }>;
    geoCities?: Array<{ name?: string; weight?: number }>;
    // Legacy fallback shapes
    gender?: { male?: number; female?: number };
    age_groups?: Record<string, number>;
    top_countries?: Array<{ country: string; percentage: number }>;
    top_cities?: Array<{ city: string; percentage: number }>;
    credibility?: number;
    credibility_score?: number;
    credibility_class?: string;
  };
  // Real keys at report level: avgLikes, avgComments, avgReelsPlays
  avgLikes?: number;
  avgComments?: number;
  avgReelsPlays?: number;
  recentReels?: Array<{ views?: number; play_count?: number; videoViews?: number }>;
  popularReels?: Array<{ views?: number; play_count?: number; videoViews?: number }>;
  reels?: {
    avg_views?: number;
    median_views?: number;
    last_8_views?: number[];
    posts?: Array<{ views?: number; videoViews?: number; play_count?: number }>;
  };
  credibility?: number;
  credibility_score?: number;
}

interface CreatorXProfileResponse {
  success?: boolean;
  message?: string;
  result?: {
    insights?:
      | Record<string, CreatorXProfileInsights>
      | CreatorXProfileInsights;
    reports?:
      | Record<string, CreatorXAudienceReport>
      | CreatorXAudienceReport;
    profile?: CreatorXProfileInsights;
    user?: CreatorXProfileInsights;
    balance?: number;
    unlock_status?: boolean;
  };
}

// Influenzer's /analytics/profile response shape isn't documented in the PDF.
// Empirically it's been seen as `result.insights[platform]` (e.g. "instagram"),
// but on server-test-2 we sometimes get the data flat at `result.insights`,
// `result.profile`, or keyed differently. Try every plausible location.
function pickInsights(
  body: CreatorXProfileResponse,
  platform: string,
): CreatorXProfileInsights | null {
  const r = body?.result;
  if (!r) return null;
  const candidates: Array<unknown> = [
    (r.insights as Record<string, CreatorXProfileInsights> | undefined)?.[platform],
    (r.insights as Record<string, CreatorXProfileInsights> | undefined)?.[
      platform === "instagram" ? "ig" : platform
    ],
    r.insights,
    r.profile,
    r.user,
  ];
  for (const c of candidates) {
    if (
      c &&
      typeof c === "object" &&
      // Heuristic: must look like a profile (has at least one of these keys)
      ("followers" in c ||
        "username" in c ||
        "fullname" in c ||
        "engagement_rate" in c ||
        "engagementRate" in c)
    ) {
      return c as CreatorXProfileInsights;
    }
  }
  return null;
}

function pickReport(
  body: CreatorXProfileResponse,
  platform: string,
): CreatorXAudienceReport | null {
  const r = body?.result;
  if (!r) return null;
  const candidates: Array<unknown> = [
    (r.reports as Record<string, CreatorXAudienceReport> | undefined)?.[platform],
    (r.reports as Record<string, CreatorXAudienceReport> | undefined)?.[
      platform === "instagram" ? "ig" : platform
    ],
    r.reports,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && ("audience" in c || "reels" in c)) {
      return c as CreatorXAudienceReport;
    }
  }
  return null;
}

// Some Influenzer responses use camelCase (engagementRate) instead of
// snake_case (engagement_rate). Coalesce both.
function pickNumber(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !isNaN(v)) return v;
  }
  return null;
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

function ageBreakdown(
  groups: Record<string, number> | undefined,
): Record<string, number> | null {
  if (!groups) return null;
  const out: Record<string, number> = {};
  for (const [code, v] of Object.entries(groups)) {
    const pct = normPct(v);
    if (pct != null) out[code] = pct;
  }
  return Object.keys(out).length ? out : null;
}

function percentageMap(
  arr: Array<{ country?: string; city?: string; percentage: number }> | undefined,
  key: "country" | "city",
): Record<string, number> | null {
  if (!arr || arr.length === 0) return null;
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = (item as Record<string, unknown>)[key];
    if (typeof k === "string") out[k] = normPct(item.percentage) ?? 0;
  }
  return Object.keys(out).length ? out : null;
}

// Influenzer returns audience percentages as either 0-1 fractions OR 0-100.
// Normalize to 0-100 so the UI shows "45%" instead of "0.45%".
function normPct(v: number | undefined | null): number | null {
  if (typeof v !== "number" || isNaN(v)) return null;
  return v <= 1 ? v * 100 : v;
}

// ============================================================
// Public API
// ============================================================

export type CreatorXPlatform = "instagram" | "youtube" | "tiktok" | "facebook";

export class CreatorXError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "CreatorXError";
  }
}

export async function fetchProfile(
  handle: string,
  platform: CreatorXPlatform = "instagram",
  opts: { unlock?: boolean } = {},
): Promise<NormalizedProfile | null> {
  if (!isCreatorXConfigured()) return null;

  const username = handle.replace(/^@/, "").trim();
  if (!username) return null;

  // Caller-supplied unlock wins. Else use env. Else default true so that
  // audience demographics + credibility actually come back populated — the
  // user is on the Add Influencer page paying for full data, the unlock
  // cost is the price.
  const unlock = opts.unlock ?? (process.env.CREATORX_UNLOCK ? UNLOCK : true);

  try {
    const res = await apiFetch("/api/analytics/profile", {
      method: "POST",
      body: JSON.stringify({ username, platform, unlock }),
    });

    // 404 on /profile doesn't necessarily mean the handle is unknown — it
    // often means the audience report wasn't generated for this handle.
    // Try the filter endpoint before giving up.
    if (res.status === 404) {
      return await profileFromFilterOnly(username, platform);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`CreatorX /profile error ${res.status}: ${text.slice(0, 200)}`);
      // Surface real failures (403 credits, 429 rate-limit, 401 auth) so the
      // route can tell the user the truth instead of silently falling
      // through to mock data.
      let apiMessage: string | undefined;
      try {
        apiMessage = (JSON.parse(text) as { message?: string })?.message;
      } catch {
        /* ignore */
      }
      throw new CreatorXError(
        apiMessage ?? `Influenzer profile fetch failed (${res.status})`,
        res.status,
        text.slice(0, 500),
      );
    }

    const body = (await res.json()) as CreatorXProfileResponse;
    const insights = pickInsights(body, platform);
    const report = pickReport(body, platform);
    if (!insights) {
      console.warn(
        `[creatorx] /profile returned no recognizable insights for @${username}. result keys=${Object.keys(body?.result ?? {}).join(",")}. payload=${JSON.stringify(body).slice(0, 800)}`,
      );
      // /profile gave us nothing. The filter endpoint is documented and
      // does return headline metrics (followers, engagementRate, fullname,
      // picture, isVerified) for any handle in the catalog. Synthesize a
      // NormalizedProfile from filter data alone — better than falling
      // through to the Instagram public-profile scrape which has even less.
      return await profileFromFilterOnly(username, platform);
    }

    const insightsRecord = insights as unknown as Record<string, unknown>;
    const reportRecord = (report ?? {}) as unknown as Record<string, unknown>;

    // Coalesce snake_case + camelCase variants — server-test-2 sometimes
    // returns `engagementRate` instead of `engagement_rate`.
    const followers =
      pickNumber(insightsRecord, "followers", "follower", "followerCount") ?? 0;
    const following =
      pickNumber(insightsRecord, "following", "followingCount") ?? 0;
    const posts =
      pickNumber(insightsRecord, "posts", "post_count", "postCount", "totalContent") ?? 0;
    const engagementRate =
      pickNumber(insightsRecord, "engagement_rate", "engagementRate", "avgEngagement");
    const engagements =
      pickNumber(insightsRecord, "engagements", "totalEngagements", "engagement_total");
    // Real keys: report.avgLikes, report.avgComments at top of report.
    const avgLikesRaw =
      pickNumber(reportRecord, "avgLikes", "avg_likes") ??
      pickNumber(
        insightsRecord,
        "avg_likes",
        "avgLikes",
        "averageLikes",
        "reelAverageLikes",
      ) ??
      pickNumber(
        (report?.reels ?? {}) as unknown as Record<string, unknown>,
        "avg_likes",
        "avgLikes",
        "reelAverageLikes",
      );
    const avgCommentsRaw =
      pickNumber(reportRecord, "avgComments", "avg_comments") ??
      pickNumber(
        insightsRecord,
        "avg_comments",
        "avgComments",
        "averageComments",
        "reelAverageComments",
      ) ??
      pickNumber(
        (report?.reels ?? {}) as unknown as Record<string, unknown>,
        "avg_comments",
        "avgComments",
        "reelAverageComments",
      );
    const avgReelViewsRaw =
      pickNumber(reportRecord, "avgReelsPlays", "avg_reels_plays") ??
      pickNumber(
        (report?.reels ?? {}) as unknown as Record<string, unknown>,
        "avg_views",
        "avgViews",
        "reelAverageViews",
      );

    // Always log when data looks sparse — usually means the parsing path
    // didn't find the right shape. Don't gate on CREATORX_DEBUG, otherwise
    // we can't diagnose without redeploying with new env vars.
    if (followers === 0 && posts === 0) {
      console.warn(
        "[creatorx] sparse profile response — followers=0 posts=0",
        {
          handle: username,
          platform,
          insights_keys: Object.keys(insightsRecord),
          report_keys: Object.keys(reportRecord),
          audience_keys: report?.audience ? Object.keys(report.audience) : null,
          reels_keys: report?.reels ? Object.keys(report.reels) : null,
          payload_preview: JSON.stringify(body).slice(0, 2000),
        },
      );
    } else if (process.env.CREATORX_DEBUG === "true") {
      console.log("[creatorx] raw response keys:", {
        insights_keys: Object.keys(insightsRecord),
        report_keys: Object.keys(reportRecord),
        audience_keys: report?.audience ? Object.keys(report.audience) : null,
        reels_keys: report?.reels ? Object.keys(report.reels) : null,
        full_payload: JSON.stringify(body).slice(0, 4000),
      });
    }

    const reels = report?.reels;

    // Try every plausible location for the credibility score.
    // Influenzer's filter API takes audience_credibility (0-1) but the
    // profile endpoint's response shape isn't documented for this field.
    const credibilityRaw =
      report?.audience?.credibility ??
      report?.audience?.credibility_score ??
      report?.credibility ??
      report?.credibility_score ??
      insights.credibility ??
      insights.credibility_score ??
      insights.audience_credibility ??
      null;
    // If it comes as 0-1, convert to 0-100 for consistency with how the
    // UI displays "Credibility Score" alongside other percentage fields.
    const igCredibilityScore =
      typeof credibilityRaw === "number"
        ? credibilityRaw <= 1
          ? credibilityRaw * 100
          : credibilityRaw
        : null;

    // Reel views: real shape uses report.recentReels[].views. Fall back to
    // legacy reels.last_8_views / reels.posts.
    const recentReelsArr = report?.recentReels ?? report?.popularReels ?? [];
    const reelViewsFromRecent = recentReelsArr
      .map((r) => r.views ?? r.play_count ?? r.videoViews ?? 0)
      .filter((v) => typeof v === "number" && v > 0)
      .slice(0, 10);
    const lastReelViews =
      reels?.last_8_views ??
      (reelViewsFromRecent.length > 0
        ? reelViewsFromRecent
        : (reels?.posts ?? [])
            .map((p) => p.views ?? p.videoViews ?? p.play_count ?? 0)
            .filter((v) => typeof v === "number" && v > 0)
            .slice(0, 10));

    // Audience demographics — real shape is arrays of {code, weight}.
    const aud = report?.audience;
    const gendersArr = aud?.genders ?? [];
    const malePctReal = gendersArr.find(
      (g) => g.code?.toUpperCase() === "MALE",
    )?.weight;
    const femalePctReal = gendersArr.find(
      (g) => g.code?.toUpperCase() === "FEMALE",
    )?.weight;

    const agesArr = aud?.ages ?? [];
    let ageBreakdownReal: Record<string, number> | null = null;
    let topAgeRangeReal: string | null = null;
    if (agesArr.length > 0) {
      const map: Record<string, number> = {};
      let topCode: string | null = null;
      let topW = -1;
      for (const a of agesArr) {
        if (typeof a.code !== "string") continue;
        const w = normPct(a.weight);
        if (w == null) continue;
        map[a.code] = w;
        if (w > topW) {
          topW = w;
          topCode = a.code;
        }
      }
      if (Object.keys(map).length) ageBreakdownReal = map;
      if (topCode) topAgeRangeReal = topCode;
    }

    const geoCountriesArr = aud?.geoCountries ?? [];
    const topCountriesReal: Record<string, number> | null =
      geoCountriesArr.length > 0
        ? Object.fromEntries(
            geoCountriesArr
              .filter((c) => typeof c.name === "string")
              .map((c) => [c.name as string, normPct(c.weight) ?? 0]),
          )
        : null;

    const geoCitiesArr = aud?.geoCities ?? [];
    const topCitiesReal: Record<string, number> | null =
      geoCitiesArr.length > 0
        ? Object.fromEntries(
            geoCitiesArr
              .filter((c) => typeof c.name === "string")
              .map((c) => [c.name as string, normPct(c.weight) ?? 0]),
          )
        : null;

    // Engagement rate — Influenzer's profile insights often don't include
    // engagement_rate. Fall back to (avgLikes + avgComments) / followers.
    let engagementRateFinal = engagementRate;
    if (
      engagementRateFinal == null &&
      followers > 0 &&
      (typeof avgLikesRaw === "number" || typeof avgCommentsRaw === "number")
    ) {
      const al = avgLikesRaw ?? 0;
      const ac = avgCommentsRaw ?? 0;
      if (al + ac > 0) engagementRateFinal = (al + ac) / followers;
    }

    const normalized: NormalizedProfile = {
      found: true,
      source: "creatorx" as NormalizedProfile["source"],
      handle: insights.username || username,
      name: insights.name || insights.fullname || username,
      bio: insights.bio || null,
      profileImageUrl: insights.profilePicture || insights.picture || null,
      email: null,
      phone: null,
      isVerified: Boolean(insights.verified ?? insights.is_verified ?? insights.isVerified),
      category: null,
      igFollowerCount: followers,
      igFollowingCount: following,
      igPostCount: posts,
      igEngagementRate: engagementRateFinal,
      // Prefer Influenzer-supplied averages. If those aren't there (the
      // common case on the test server), compute a usable proxy from total
      // engagements + post count. ~95% of engagements on IG are likes, so
      // avg_likes ≈ engagements/posts is a decent estimate; we don't have a
      // signal to split likes vs comments, so leave avg_comments null when
      // not directly returned.
      igAvgLikes:
        avgLikesRaw ??
        (typeof engagements === "number" && posts > 0
          ? Math.round((engagements * 0.97) / posts)
          : engagementRate != null && followers > 0
            ? Math.round(
                ((engagementRate <= 1 ? engagementRate : engagementRate / 100) *
                  followers) *
                  0.97,
              )
            : null),
      igAvgComments:
        avgCommentsRaw ??
        (typeof engagements === "number" && posts > 0
          ? Math.round((engagements * 0.03) / posts)
          : null),
      igAvgReelViews:
        avgReelViewsRaw ??
        (typeof reels?.avg_views === "number" ? reels.avg_views : null),
      igAvgStoryViews: null,
      igMedianReelViews: typeof reels?.median_views === "number" ? reels.median_views : null,
      igLast8ReelViews: lastReelViews,
      igCredibilityScore,
      igAudienceMalePct:
        normPct(malePctReal) ?? normPct(report?.audience?.gender?.male),
      igAudienceFemalePct:
        normPct(femalePctReal) ?? normPct(report?.audience?.gender?.female),
      igAudienceTopAgeRange:
        topAgeRangeReal ?? topAgeRange(report?.audience?.age_groups),
      igAudienceAgeBreakdown:
        ageBreakdownReal ?? ageBreakdown(report?.audience?.age_groups),
      igAudienceTopCities:
        topCitiesReal ?? percentageMap(report?.audience?.top_cities, "city"),
      igAudienceTopCountries:
        topCountriesReal ??
        percentageMap(report?.audience?.top_countries, "country"),
      categories: [],
      tier: tierFromFollowers(followers),
      avgVideoDuration: null,
      avgReshareCount: null,
      popularPostingDays: null,
      avgPostPerWeek: null,
      recentReels: [],
      lastUpdated: null,
    };

    // /analytics/profile is unreliable on server-test-2 — it often returns
    // partial data (e.g. `following: 7` and zeros for everything else) or
    // missing engagement_rate. The filter endpoint is the documented source
    // of headline metrics and reliably returns followers / engagementRate /
    // fullname / picture / isVerified. Run it whenever any of those is missing.
    const needsHeadlineTopUp =
      normalized.igFollowerCount === 0 ||
      normalized.igPostCount === 0 ||
      normalized.igEngagementRate == null ||
      normalized.igEngagementRate === 0 ||
      !normalized.profileImageUrl ||
      normalized.name === username;

    if (needsHeadlineTopUp) {
      const filterHit = await filterByUsername(username, platform).catch((e) => {
        console.warn("[creatorx] filter fallback failed:", e);
        return null;
      });
      if (filterHit) {
        if ((normalized.igFollowerCount ?? 0) === 0 && filterHit.followers != null) {
          normalized.igFollowerCount = filterHit.followers;
        }
        // engagementRate from filter is 0-1 per the doc. Take it whenever the
        // /profile path didn't give us a usable number.
        if (
          (normalized.igEngagementRate == null || normalized.igEngagementRate === 0) &&
          typeof filterHit.engagementRate === "number"
        ) {
          normalized.igEngagementRate = filterHit.engagementRate;
        }
        if (!normalized.name || normalized.name === username) {
          normalized.name = filterHit.fullname || normalized.name;
        }
        if (!normalized.profileImageUrl) {
          normalized.profileImageUrl = filterHit.picture ?? null;
        }
        if (!normalized.isVerified && filterHit.isVerified) {
          normalized.isVerified = true;
        }
        normalized.tier = tierFromFollowers(normalized.igFollowerCount);

        // If avg likes is still missing but we now have a usable
        // engagementRate + followers, compute a proxy.
        if (
          normalized.igAvgLikes == null &&
          typeof normalized.igEngagementRate === "number" &&
          normalized.igFollowerCount > 0
        ) {
          const er =
            normalized.igEngagementRate <= 1
              ? normalized.igEngagementRate
              : normalized.igEngagementRate / 100;
          normalized.igAvgLikes = Math.round(
            er * normalized.igFollowerCount * 0.97,
          );
        }
      }
    }

    return normalized;
  } catch (err) {
    console.error("CreatorX fetchProfile failed:", err);
    // Re-throw typed errors so the caller can distinguish rate-limit / auth
    // failures from network/parsing failures and from "profile not found".
    if (err instanceof CreatorXError) throw err;
    return null;
  }
}

// Synthesize a NormalizedProfile from filter-endpoint data alone, used
// when /analytics/profile gives nothing back. Headline metrics only —
// audience demographics + reels are still null because filter doesn't
// expose them, but it beats falling through to the public-IG scrape.
async function profileFromFilterOnly(
  username: string,
  platform: CreatorXPlatform,
): Promise<NormalizedProfile | null> {
  const hit = await filterByUsername(username, platform).catch((e) => {
    console.warn("[creatorx] profileFromFilterOnly: filter failed:", e);
    return null;
  });
  if (!hit) return null;

  const followers = hit.followers ?? 0;
  const er =
    typeof hit.engagementRate === "number" ? hit.engagementRate : null;
  const avgLikes =
    er != null && followers > 0
      ? Math.round((er <= 1 ? er : er / 100) * followers * 0.97)
      : null;

  return {
    found: true,
    source: "creatorx" as NormalizedProfile["source"],
    handle: hit.username || username,
    name: hit.fullname || username,
    bio: null,
    profileImageUrl: hit.picture ?? null,
    email: null,
    phone: null,
    isVerified: hit.isVerified,
    category: null,
    igFollowerCount: followers,
    igFollowingCount: 0,
    igPostCount: 0,
    igEngagementRate: er,
    igAvgLikes: avgLikes,
    igAvgComments: null,
    igAvgReelViews: null,
    igAvgStoryViews: null,
    igMedianReelViews: null,
    igLast8ReelViews: [],
    igCredibilityScore: null,
    igAudienceMalePct: null,
    igAudienceFemalePct: null,
    igAudienceTopAgeRange: null,
    igAudienceAgeBreakdown: null,
    igAudienceTopCities: null,
    igAudienceTopCountries: null,
    categories: [],
    tier: tierFromFollowers(followers),
    avgVideoDuration: null,
    avgReshareCount: null,
    popularPostingDays: null,
    avgPostPerWeek: null,
    recentReels: [],
    lastUpdated: null,
  };
}

// ============================================================
// Filter-endpoint fallback for headline metrics
// ============================================================

interface FilterHit {
  followers: number | null;
  engagements: number | null;
  engagementRate: number | null;
  fullname: string | null;
  picture: string | null;
  isVerified: boolean;
  username: string | null;
}

async function filterByUsername(
  username: string,
  platform: CreatorXPlatform,
): Promise<FilterHit | null> {
  // Filter endpoint only supports ig/yt/tt — facebook would 4xx here, skip.
  if (platform !== "instagram" && platform !== "youtube" && platform !== "tiktok") {
    return null;
  }
  const res = await apiFetch(
    `/api/analytics/${platform}/search/filter`,
    {
      method: "POST",
      body: JSON.stringify({
        sort: { field: "followers", direction: "desc", id: null },
        paging: { limit: 5, skip: 0 },
        audience_source: "any",
        filter: {
          username: { value: username, operator: "exact" },
        },
      }),
    },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    success?: boolean;
    result?: {
      directs?: Array<{ profile?: Record<string, unknown> }>;
      lookalikes?: Array<{ profile?: Record<string, unknown> }>;
    };
  };
  if (body?.success === false) return null;
  const hits = [
    ...(body?.result?.directs ?? []),
    ...(body?.result?.lookalikes ?? []),
  ];
  // Find an exact match — filter sometimes returns lookalikes with the same
  // operator, but those aren't the requested user.
  const exact = hits.find(
    (h) =>
      typeof h?.profile?.username === "string" &&
      (h.profile.username as string).toLowerCase() === username.toLowerCase(),
  );
  const p = (exact?.profile ?? hits[0]?.profile) as Record<string, unknown> | undefined;
  if (!p) return null;
  return {
    followers: typeof p.followers === "number" ? p.followers : null,
    engagements: typeof p.engagements === "number" ? p.engagements : null,
    engagementRate: typeof p.engagementRate === "number" ? p.engagementRate : null,
    fullname: typeof p.fullname === "string" ? p.fullname : null,
    picture: typeof p.picture === "string" ? p.picture : null,
    isVerified: Boolean(p.isVerified),
    username: typeof p.username === "string" ? p.username : null,
  };
}
