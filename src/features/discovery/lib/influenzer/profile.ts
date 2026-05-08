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
import type {
  BrandAffinityEntry,
  CreatorDetailResponse,
  GrowthDelta,
  NamedPct,
  Platform,
  SocialHandles,
  StatHistoryPoint,
} from "../types";

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
  name?: string;
  fullname?: string;
  profilePicture?: string;
  picture?: string;
  bio?: string;
  follower?: number;
  followers?: number;
  following?: number;
  engagements?: number;
  engagement_rate?: number;
  totalContent?: number;
  totalLikes?: number;
  totalComment?: number;
  totalComments?: number;
  totalViews?: number;
  total_views?: number;
  reelsCount?: number;
  reels_count?: number;
  posts?: number;
  verified?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  isPrivate?: boolean;
  is_private?: boolean;
  isHidden?: boolean;
  category?: string;
  external_url?: string;
  externalUrl?: string;
  public_email?: string;
  publicEmail?: string;
  phone_number?: string;
  phoneNumber?: string;
  // Creator's own demographics (when surfaced)
  gender?: string;
  age?: string;
  country?: string | { name?: string };
  city?: string | { name?: string };
  language?: string | { code?: string; name?: string };
  // Last activity
  lastPosted?: string;
  last_posted?: string;
  lastPostDate?: string;
  // Account type / flags
  accountType?: string | number;
  account_type?: string | number;
  hasAds?: boolean;
  has_ads?: boolean;
  hasAudienceData?: boolean;
  has_audience_data?: boolean;
  isOfficialArtist?: boolean;
  is_official_artist?: boolean;
  // Contact / handles (under any plausible naming)
  contacts?: Array<{ type?: string; value?: string; formatted_value?: string }>;
  socialHandles?: Record<string, string>;
  links?: Array<{ type?: string; value?: string; url?: string }>;
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

interface RawNamedWeight {
  code?: string;
  name?: string;
  weight?: number;
}

interface RawAudience {
  genders?: RawAudienceGenderEntry[];
  ages?: RawAudienceAgeEntry[];
  geoCountries?: RawAudienceGeoEntry[];
  geoCities?: RawAudienceGeoEntry[];
  geoStates?: RawAudienceGeoEntry[];
  geoSubdivisions?: RawAudienceGeoEntry[];
  languages?: RawNamedWeight[];
  ethnicities?: RawNamedWeight[];
  brandAffinity?: Array<RawNamedWeight & { category?: string }>;
  interests?: RawNamedWeight[];
  credibility?: number;
  credibility_class?: string;
  credibilityClass?: string;
  // Legacy/fallback shapes
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
  video_views?: number;
  viewCount?: number;
  view_count?: number;
  plays?: number;
  reelPlays?: number;
  reel_plays?: number;
  likes?: number;
  like_count?: number;
  comments?: number;
  comment_count?: number;
  caption?: string;
  date?: string;
  posted_at?: string;
  postedAt?: string;
  permalink?: string;
  thumbnail?: string;
  media_url?: string;
  thumbnail_url?: string;
  url?: string;
}

interface RawStatHistoryPoint {
  month?: string;
  date?: string;
  followers?: number;
  following?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
}

interface RawProfileReport {
  audience?: RawAudience;
  reels?: RawReels;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avg_views?: number;
  avgShares?: number;
  avg_shares?: number;
  avgSaves?: number;
  avg_saves?: number;
  avgReelsPlays?: number;
  recentReels?: RawRecentReel[];
  popularReels?: RawRecentReel[];
  recentPosts?: RawRecentReel[];
  popularPosts?: RawRecentReel[];
  sponsoredPosts?: RawRecentReel[];
  adPosts?: RawRecentReel[];
  hashtags?: RawNamedWeight[];
  mentions?: RawNamedWeight[];
  keywords?: RawNamedWeight[];
  brandAffinity?: Array<RawNamedWeight & { category?: string }>;
  interests?: RawNamedWeight[];
  statHistory?: RawStatHistoryPoint[];
  cxScore?: number;
  accountType?: string | number;
  hasAds?: boolean;
  has_ads?: boolean;
  hasAudienceData?: boolean;
  has_audience_data?: boolean;
  isOfficialArtist?: boolean;
  is_official_artist?: boolean;
  lastPosted?: string;
  last_posted?: string;
  lastPostDate?: string;
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

  // Reels — try every plausible key Influenzer might use for views.
  const recentReelsRaw = rep.recentReels ?? [];
  const popularReelsRaw = rep.popularReels ?? [];

  const pickReelViews = (r: RawRecentReel | undefined): number | null => {
    if (!r) return null;
    const candidates = [
      r.views,
      r.play_count,
      r.videoViews,
      r.video_views,
      r.viewCount,
      r.view_count,
      r.plays,
      r.reelPlays,
      r.reel_plays,
    ];
    for (const v of candidates) {
      if (typeof v === "number" && v > 0) return v;
    }
    return null;
  };

  const allReelsRaw = recentReelsRaw.length > 0 ? recentReelsRaw : popularReelsRaw;
  const reelViewsFromRecent = allReelsRaw
    .map((r) => pickReelViews(r) ?? 0)
    .filter((v) => v > 0)
    .slice(0, 10);

  const lastReelViews =
    reels.last_8_views ??
    (reelViewsFromRecent.length > 0
      ? reelViewsFromRecent
      : (reels.posts ?? [])
          .map((p) => p.views ?? p.videoViews ?? p.play_count ?? 0)
          .filter((v) => typeof v === "number" && v > 0)
          .slice(0, 10));

  const reelToPreview = (r: RawRecentReel) => ({
    url: r.permalink ?? r.url ?? null,
    thumbnail: r.thumbnail ?? r.thumbnail_url ?? r.media_url ?? null,
    views: pickReelViews(r),
    likes:
      typeof r.likes === "number"
        ? r.likes
        : typeof r.like_count === "number"
          ? r.like_count
          : null,
    comments:
      typeof r.comments === "number"
        ? r.comments
        : typeof r.comment_count === "number"
          ? r.comment_count
          : null,
    caption: r.caption ?? null,
    postedAt: r.date ?? r.posted_at ?? r.postedAt ?? null,
  });

  const recentReels = recentReelsRaw.slice(0, 12).map(reelToPreview);
  const popularReels = popularReelsRaw.slice(0, 8).map(reelToPreview);

  // avgReelViews — accept multiple key names. Median similarly.
  const repRecord = rep as unknown as Record<string, unknown>;
  const reelsRecord = (reels ?? {}) as unknown as Record<string, unknown>;
  const pickFirstNumber = (
    obj: Record<string, unknown>,
    keys: string[],
  ): number | null => {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "number" && v > 0) return v;
    }
    return null;
  };
  const avgReelViews =
    pickFirstNumber(repRecord, [
      "avgReelsPlays",
      "avg_reels_plays",
      "avgReelViews",
      "avg_reel_views",
      "avgViews",
    ]) ??
    pickFirstNumber(reelsRecord, ["avg_views", "avgViews", "average_views"]);
  const medianReelViews =
    pickFirstNumber(repRecord, [
      "medianReelsPlays",
      "median_reels_plays",
      "medianReelViews",
      "median_reel_views",
      "medianViews",
    ]) ??
    pickFirstNumber(reelsRecord, [
      "median_views",
      "medianViews",
      "median",
    ]) ??
    // Compute median ourselves from the recent reels if we have at least 3.
    (() => {
      const vs = recentReels
        .map((r) => r.views)
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (vs.length < 3) return null;
      const sorted = vs.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    })();

  const followers = ins.follower ?? ins.followers ?? null;
  const posts = ins.totalContent ?? ins.posts ?? null;
  const fullname = ins.name ?? ins.fullname ?? null;
  const picture = ins.profilePicture ?? ins.picture ?? null;
  const isVerified = Boolean(ins.verified ?? ins.is_verified ?? ins.isVerified);

  // Engagements (total) — Influenzer doesn't return this as one number for
  // many profiles. Try the explicit field; else fall back to avgLikes +
  // avgComments × posts; else derive from totalLikes + totalComment.
  const insRecord = ins as unknown as Record<string, unknown>;
  let engagements: number | null =
    typeof ins.engagements === "number" ? ins.engagements : null;
  if (engagements == null) {
    const totalLikes = pickFirstNumber(insRecord, ["totalLikes"]);
    const totalComment = pickFirstNumber(insRecord, [
      "totalComment",
      "totalComments",
    ]);
    if (totalLikes != null || totalComment != null) {
      engagements = (totalLikes ?? 0) + (totalComment ?? 0);
    }
  }
  if (
    engagements == null &&
    posts &&
    posts > 0 &&
    (typeof rep.avgLikes === "number" || typeof rep.avgComments === "number")
  ) {
    engagements = ((rep.avgLikes ?? 0) + (rep.avgComments ?? 0)) * posts;
  }

  let engagementRate = ins.engagement_rate ?? null;
  if (engagementRate == null && followers && followers > 0) {
    const al = rep.avgLikes ?? 0;
    const ac = rep.avgComments ?? 0;
    if (al + ac > 0) {
      engagementRate = (al + ac) / followers;
    }
  }
  // Some upstream payloads return engagement_rate as a percentage (e.g. 7.63)
  // instead of the documented 0–1 fraction. Normalize so downstream `× 100`
  // never produces 763%.
  if (engagementRate != null && engagementRate > 1) {
    engagementRate = engagementRate / 100;
  }

  // Audience: states (geoStates), languages, ethnicities, brand affinity, interests.
  const topStates = Array.isArray(audience.geoStates)
    ? audience.geoStates
        .filter((x) => typeof x.name === "string")
        .map((x) => ({ name: x.name as string, pct: normPct(x.weight) ?? 0 }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  const namedWeightToPct = (arr: RawNamedWeight[] | undefined): NamedPct[] =>
    Array.isArray(arr)
      ? arr
          .filter((x) => typeof (x.name ?? x.code) === "string")
          .map((x) => ({
            name: (x.name ?? x.code) as string,
            pct: normPct(x.weight) ?? 0,
          }))
          .sort((a, b) => b.pct - a.pct)
      : [];

  const audienceLanguages = namedWeightToPct(audience.languages);
  const audienceEthnicities = namedWeightToPct(audience.ethnicities);
  const audienceInterests = namedWeightToPct(audience.interests);

  const audienceBrandAffinity: BrandAffinityEntry[] = Array.isArray(
    audience.brandAffinity,
  )
    ? audience.brandAffinity
        .filter((x) => typeof (x.name ?? x.code) === "string")
        .map((x) => ({
          name: (x.name ?? x.code) as string,
          pct: normPct(x.weight) ?? 0,
          category: x.category ?? null,
        }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  // Per-creator content arrays.
  const hashtags = namedWeightToPct(rep.hashtags);
  const mentions = namedWeightToPct(rep.mentions);
  const keywords = namedWeightToPct(rep.keywords);
  const interests = namedWeightToPct(rep.interests);

  // Creator-side brandAffinity uses different weight keys than audience-side.
  // Try every plausible name. If absolutely nothing matches and the weight
  // ends up 0 across the board, drop the entry rather than rendering "0.0%".
  const pickEntryWeight = (x: Record<string, unknown>): number | null => {
    const candidates = [
      x.weight,
      x.affinity,
      x.score,
      x.value,
      x.percentage,
      x.pct,
      x.share,
      x.relevance,
    ];
    for (const v of candidates) {
      if (typeof v === "number" && !isNaN(v)) return v;
    }
    return null;
  };
  const brandAffinity: BrandAffinityEntry[] = Array.isArray(rep.brandAffinity)
    ? rep.brandAffinity
        .filter((x) => typeof (x.name ?? x.code) === "string")
        .map((x) => {
          const raw = pickEntryWeight(x as unknown as Record<string, unknown>);
          return {
            name: (x.name ?? x.code) as string,
            pct: normPct(raw ?? undefined) ?? 0,
            category: x.category ?? null,
          };
        })
        // Filter out entries where every weight key was missing/zero so we
        // don't render a list of "0.0%" badges that look broken.
        .filter((b) => b.pct > 0)
        .sort((a, b) => b.pct - a.pct)
    : [];

  // Stat history (followers / avgLikes per month) — used for sparkline.
  const statHistory: StatHistoryPoint[] = Array.isArray(rep.statHistory)
    ? rep.statHistory.map((p) => ({
        month: p.month ?? p.date ?? "",
        followers: typeof p.followers === "number" ? p.followers : null,
        following: typeof p.following === "number" ? p.following : null,
        avgLikes: typeof p.avgLikes === "number" ? p.avgLikes : null,
        avgComments: typeof p.avgComments === "number" ? p.avgComments : null,
        avgViews: typeof p.avgViews === "number" ? p.avgViews : null,
      }))
    : [];

  const credibilityRaw = audience.credibility;
  const credibilityClass =
    audience.credibility_class ?? audience.credibilityClass ?? null;
  const audienceCredibility =
    typeof credibilityRaw === "number"
      ? credibilityRaw <= 1
        ? credibilityRaw * 100
        : credibilityRaw
      : null;

  // Account type (Instagram: 1=Regular, 2=Business, 3=Creator)
  const accountTypeRaw = rep.accountType ?? ins.accountType ?? ins.account_type ?? null;
  const accountType =
    accountTypeRaw == null ? null : String(accountTypeRaw);
  const accountTypeLabel = (() => {
    if (accountTypeRaw == null) return null;
    const n =
      typeof accountTypeRaw === "number"
        ? accountTypeRaw
        : Number(accountTypeRaw);
    if (n === 1) return "Regular";
    if (n === 2) return "Business";
    if (n === 3) return "Creator";
    return typeof accountTypeRaw === "string" ? accountTypeRaw : null;
  })();

  // Total views / likes / comments / reels count from any plausible key
  const totalViews = pickFirstNumber(insRecord, [
    "totalViews",
    "total_views",
    "viewsCount",
    "views",
  ]);
  const totalLikes = pickFirstNumber(insRecord, ["totalLikes", "total_likes"]);
  const totalComments = pickFirstNumber(insRecord, [
    "totalComment",
    "totalComments",
    "total_comments",
  ]);
  const reelsCount = pickFirstNumber(insRecord, [
    "reelsCount",
    "reels_count",
    "totalReels",
    "total_reels",
  ]);

  // Per-post averages beyond likes/comments
  const repRecord2 = rep as unknown as Record<string, unknown>;
  const avgViews = pickFirstNumber(repRecord2, [
    "avgViews",
    "avg_views",
    "averageViews",
  ]);
  const avgShares = pickFirstNumber(repRecord2, [
    "avgShares",
    "avg_shares",
    "averageShares",
  ]);
  const avgSaves = pickFirstNumber(repRecord2, [
    "avgSaves",
    "avg_saves",
    "averageSaves",
  ]);

  // Status flags
  const hasAds =
    typeof ins.hasAds === "boolean"
      ? ins.hasAds
      : typeof ins.has_ads === "boolean"
        ? ins.has_ads
        : typeof rep.hasAds === "boolean"
          ? rep.hasAds
          : typeof rep.has_ads === "boolean"
            ? rep.has_ads
            : null;
  const hasAudienceData =
    typeof ins.hasAudienceData === "boolean"
      ? ins.hasAudienceData
      : typeof ins.has_audience_data === "boolean"
        ? ins.has_audience_data
        : typeof rep.hasAudienceData === "boolean"
          ? rep.hasAudienceData
          : typeof rep.has_audience_data === "boolean"
            ? rep.has_audience_data
            : Object.keys(audience).length > 0;
  const isOfficialArtist =
    typeof ins.isOfficialArtist === "boolean"
      ? ins.isOfficialArtist
      : typeof ins.is_official_artist === "boolean"
        ? ins.is_official_artist
        : typeof rep.isOfficialArtist === "boolean"
          ? rep.isOfficialArtist
          : typeof rep.is_official_artist === "boolean"
            ? rep.is_official_artist
            : null;

  // Last posted — try several keys + fall back to most-recent reel/post date
  const lastPostedRaw =
    ins.lastPosted ??
    ins.last_posted ??
    ins.lastPostDate ??
    rep.lastPosted ??
    rep.last_posted ??
    rep.lastPostDate ??
    recentReelsRaw[0]?.date ??
    recentReelsRaw[0]?.posted_at ??
    recentReelsRaw[0]?.postedAt ??
    null;
  const lastPostedAt = lastPostedRaw ?? null;
  const daysSinceLastPost = (() => {
    if (!lastPostedAt) return null;
    const t = Date.parse(lastPostedAt);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  })();

  // Creator's own demographics
  const creatorGender =
    typeof ins.gender === "string" ? ins.gender.toUpperCase() : null;
  const creatorAge = typeof ins.age === "string" ? ins.age : null;
  const pickName = (
    v: string | { name?: string } | undefined,
  ): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v;
    return typeof v.name === "string" ? v.name : null;
  };
  const creatorGeoCountry = pickName(ins.country);
  const creatorGeoCity = pickName(ins.city);
  const creatorLang =
    typeof ins.language === "string"
      ? ins.language
      : typeof ins.language === "object" && ins.language
        ? ins.language.code ?? ins.language.name ?? null
        : null;

  // Social handles — accept array shape (`contacts` / `links`) or map
  const handleMap: Record<string, string> = {};
  if (ins.socialHandles && typeof ins.socialHandles === "object") {
    for (const [k, v] of Object.entries(ins.socialHandles)) {
      if (typeof v === "string") handleMap[k.toLowerCase()] = v;
    }
  }
  const collectHandles = (
    arr: Array<{ type?: string; value?: string; formatted_value?: string; url?: string }> | undefined,
  ) => {
    if (!Array.isArray(arr)) return;
    for (const c of arr) {
      const t = (c.type ?? "").toLowerCase();
      const v = c.value ?? c.formatted_value ?? c.url ?? null;
      if (t && typeof v === "string" && v.trim()) {
        if (!handleMap[t]) handleMap[t] = v;
      }
    }
  };
  collectHandles(ins.contacts);
  collectHandles(ins.links);
  const socialHandles: SocialHandles = {
    instagram: handleMap.instagram ?? null,
    facebook: handleMap.facebook ?? null,
    twitter: handleMap.twitter ?? handleMap.x ?? null,
    youtube: handleMap.youtube ?? null,
    tiktok: handleMap.tiktok ?? null,
    snapchat: handleMap.snapchat ?? null,
    telegram: handleMap.telegram ?? null,
    whatsapp: handleMap.whatsapp ?? null,
    linktree: handleMap.linktree ?? null,
    threads: handleMap.threads ?? null,
  };

  // Growth deltas computed from statHistory (no extra API call)
  const growth: GrowthDelta[] = (() => {
    if (statHistory.length < 2) return [];
    const intervals = [1, 3, 6];
    const last = statHistory[statHistory.length - 1];
    const out: GrowthDelta[] = [];
    for (const m of intervals) {
      const idx = statHistory.length - 1 - m;
      if (idx < 0) continue;
      const ref = statHistory[idx];
      const pct = (a: number | null, b: number | null): number | null => {
        if (a == null || b == null || b <= 0) return null;
        return ((a - b) / b) * 100;
      };
      out.push({
        intervalMonths: m,
        followersPct: pct(last.followers, ref.followers),
        likesPct: pct(last.avgLikes, ref.avgLikes),
        viewsPct: pct(last.avgViews, ref.avgViews),
      });
    }
    return out;
  })();

  // Sponsored / ad posts and additional post buckets
  const recentPosts = (rep.recentPosts ?? []).slice(0, 12).map(reelToPreview);
  const sponsoredPosts = (rep.sponsoredPosts ?? rep.adPosts ?? [])
    .slice(0, 12)
    .map(reelToPreview);

  const isPrivate = Boolean(ins.isPrivate ?? ins.is_private ?? ins.isHidden);

  return {
    handle: ins.username ?? handle,
    platform,
    fullname,
    picture,
    bio: ins.bio ?? null,
    isVerified,
    isPrivate,
    category: ins.category ?? null,
    externalUrl: ins.external_url ?? ins.externalUrl ?? null,
    accountType,
    accountTypeLabel,
    publicEmail: ins.public_email ?? ins.publicEmail ?? null,
    publicPhone: ins.phone_number ?? ins.phoneNumber ?? null,
    socialHandles,
    followers,
    following: ins.following ?? null,
    posts,
    totalViews,
    totalLikes,
    totalComments,
    reelsCount,
    engagements,
    engagementRate,
    hasAds,
    hasAudienceData,
    isOfficialArtist,
    lastPostedAt,
    daysSinceLastPost,
    creatorGender,
    creatorAge,
    creatorGeoCountry,
    creatorGeoCity,
    creatorLang,
    audienceGenderMale: male,
    audienceGenderFemale: female,
    audienceCredibility,
    audienceCredibilityClass: credibilityClass,
    audienceAgeGroups: ageGroups,
    audienceTopCountries: topCountries,
    audienceTopCities: topCities,
    audienceTopStates: topStates,
    audienceLanguages,
    audienceEthnicities,
    audienceBrandAffinity,
    audienceInterests,
    hashtags,
    mentions,
    keywords,
    brandAffinity,
    interests,
    avgLikes: rep.avgLikes ?? null,
    avgComments: rep.avgComments ?? null,
    avgViews,
    avgShares,
    avgSaves,
    avgReelViews,
    medianReelViews,
    lastReelViews,
    recentReels,
    popularReels,
    recentPosts,
    sponsoredPosts,
    statHistory,
    growth,
    cxScore: typeof rep.cxScore === "number" ? rep.cxScore : null,
    balance: typeof raw?.result?.balance === "number" ? raw.result.balance : null,
    fetchedAt: new Date().toISOString(),
  };
}

function normPct(v: number | undefined): number | null {
  if (typeof v !== "number") return null;
  // If value is <=1, treat as decimal fraction; else assume already a percentage
  return v <= 1 ? v * 100 : v;
}
