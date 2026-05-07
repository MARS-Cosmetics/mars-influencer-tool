/**
 * CultureX API Client
 *
 * Real integration with CultureX analytics API.
 * Falls back to mock data when CULTUREX_API_TOKEN is not set.
 *
 * API: POST https://analytics-api.culturex.in/api/instagram/profile
 * Auth: Bearer token
 */

const CULTUREX_API_URL = "https://analytics-api.culturex.in/api/instagram/profile";
const CULTUREX_API_TOKEN = process.env.CULTUREX_API_TOKEN;

export const USE_MOCK = !CULTUREX_API_TOKEN;

// ============================================================
// Types matching CultureX API response
// ============================================================

export interface CultureXReelPost {
  code: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  date: string;
  permalink: string;
  reshare_count: number;
  video_duration: number;
  is_paid_partnership: boolean;
  is_branded_content: boolean;
  media_type: string;
  is_reel: boolean;
}

export interface CultureXProfile {
  name: string;
  username: string;
  isVerified: boolean;
  profilePicture: string;
  follower: number;
  following: number;
  totalContent: number;
  totalLikes: number;
  category: string;
  externalURL: string;
  publicEmail: string;
  phoneNumber: string;
  bio: string;
  lastUpdated: string;
  reels: {
    calculatedFrom: number;
    posts: CultureXReelPost[];
    reelAverageLikes: number;
    reelAverageComments: number;
    reelAverageViews: number;
    reelCount: number;
    avgEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    likesCommentsRatio: number;
    avgVideoDuration: number;
    avgReshareCount: number;
    popularPostingDays: Array<{ label: string; value: number }>;
    avgPostPerDay: number;
    avgPostPerWeek: number;
    avgPostPerMonth: number;
  };
}

// ============================================================
// Normalized output (maps to our schema)
// ============================================================

export interface NormalizedProfile {
  found: boolean;
  source: "culturex" | "creatorx" | "instagram_fallback" | "mock";
  handle: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  email: string | null;
  phone: string | null;
  isVerified: boolean;
  category: string | null;
  igFollowerCount: number;
  igFollowingCount: number;
  igPostCount: number;
  igEngagementRate: number | null;
  igAvgLikes: number | null;
  igAvgComments: number | null;
  igAvgReelViews: number | null;
  igAvgStoryViews: number | null;
  igMedianReelViews: number | null;
  igLast8ReelViews: number[];
  igCredibilityScore: number | null;
  igAudienceMalePct: number | null;
  igAudienceFemalePct: number | null;
  igAudienceTopAgeRange: string | null;
  igAudienceAgeBreakdown: Record<string, number> | null;
  igAudienceTopCities: Record<string, number> | null;
  igAudienceTopCountries: Record<string, number> | null;
  categories: string[];
  tier: string;
  // CultureX-specific extras
  avgVideoDuration: number | null;
  avgReshareCount: number | null;
  popularPostingDays: Array<{ label: string; value: number }> | null;
  avgPostPerWeek: number | null;
  recentReels: CultureXReelPost[];
  lastUpdated: string | null;
}

// ============================================================
// Calculate tier from follower count
// ============================================================

function calculateTier(followers: number): string {
  if (followers < 10000) return "nano";
  if (followers < 50000) return "micro";
  if (followers < 200000) return "mid";
  if (followers < 1000000) return "macro";
  return "mega";
}

// ============================================================
// Calculate median from an array of numbers
// ============================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.floor((sorted[mid - 1] + sorted[mid]) / 2);
}

// ============================================================
// Map CultureX category to our categories
// ============================================================

function mapCategory(cxCategory: string): string[] {
  const lower = cxCategory.toLowerCase();
  const categories: string[] = [];

  if (lower.includes("beauty") || lower.includes("makeup")) categories.push("beauty");
  if (lower.includes("fashion") || lower.includes("style")) categories.push("fashion");
  if (lower.includes("lifestyle")) categories.push("lifestyle");
  if (lower.includes("food") || lower.includes("cook")) categories.push("food");
  if (lower.includes("fitness") || lower.includes("health")) categories.push("fitness");
  if (lower.includes("travel")) categories.push("travel");
  if (lower.includes("tech") || lower.includes("digital")) categories.push("tech");
  if (lower.includes("comedy") || lower.includes("entertainment")) categories.push("entertainment");
  if (lower.includes("education")) categories.push("education");
  if (lower.includes("art") || lower.includes("design") || lower.includes("photograph")) categories.push("art");
  if (lower.includes("music")) categories.push("music");
  if (lower.includes("gaming")) categories.push("gaming");

  // If nothing matched, use the raw category
  if (categories.length === 0 && cxCategory) {
    categories.push(cxCategory.toLowerCase().replace(/\s+/g, "_"));
  }

  return categories;
}

// ============================================================
// Normalize CultureX response to our schema
// ============================================================

function normalizeCultureXResponse(cx: CultureXProfile): NormalizedProfile {
  const reelViews = cx.reels.posts.map((p) => p.views);
  const last8Views = reelViews.slice(0, 8);

  return {
    found: true,
    source: "culturex",
    handle: cx.username,
    name: cx.name,
    bio: cx.bio || null,
    profileImageUrl: cx.profilePicture || null,
    email: cx.publicEmail || null,
    phone: cx.phoneNumber || null,
    isVerified: cx.isVerified,
    category: cx.category || null,
    igFollowerCount: cx.follower,
    igFollowingCount: cx.following,
    igPostCount: cx.totalContent,
    igEngagementRate: cx.reels.avgEngagement || null,
    igAvgLikes: cx.reels.reelAverageLikes || null,
    igAvgComments: cx.reels.reelAverageComments || null,
    igAvgReelViews: cx.reels.reelAverageViews || null,
    igAvgStoryViews: null, // Not available from CultureX
    igMedianReelViews: calculateMedian(reelViews),
    igLast8ReelViews: last8Views,
    igCredibilityScore: null, // Not available from this endpoint
    igAudienceMalePct: null,  // Not available from this endpoint
    igAudienceFemalePct: null,
    igAudienceTopAgeRange: null,
    igAudienceAgeBreakdown: null,
    igAudienceTopCities: null,
    igAudienceTopCountries: null,
    categories: mapCategory(cx.category || ""),
    tier: calculateTier(cx.follower),
    // CultureX extras
    avgVideoDuration: cx.reels.avgVideoDuration || null,
    avgReshareCount: cx.reels.avgReshareCount || null,
    popularPostingDays: cx.reels.popularPostingDays || null,
    avgPostPerWeek: cx.reels.avgPostPerWeek || null,
    recentReels: cx.reels.posts || [],
    lastUpdated: cx.lastUpdated || null,
  };
}

// ============================================================
// Fetch profile from CultureX (real or mock)
// ============================================================

export async function fetchProfile(handle: string): Promise<NormalizedProfile | null> {
  const cleanHandle = handle.replace(/^@/, "");

  if (USE_MOCK) {
    return getMockProfile(cleanHandle);
  }

  try {
    const response = await fetch(CULTUREX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CULTUREX_API_TOKEN}`,
      },
      body: JSON.stringify({ usernames: [cleanHandle] }),
    });

    if (!response.ok) {
      console.error(`CultureX API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.result || data.result.length === 0) {
      console.log(`CultureX: profile not found for @${cleanHandle}`);
      return null;
    }

    const profile = data.result[0] as CultureXProfile;
    return normalizeCultureXResponse(profile);
  } catch (error) {
    console.error("CultureX API call failed:", error);
    return null;
  }
}

// ============================================================
// Batch fetch (CultureX supports multiple usernames in one call)
// ============================================================

export async function fetchProfiles(handles: string[]): Promise<Map<string, NormalizedProfile>> {
  const cleanHandles = handles.map((h) => h.replace(/^@/, ""));
  const results = new Map<string, NormalizedProfile>();

  if (USE_MOCK) {
    for (const handle of cleanHandles) {
      const profile = getMockProfile(handle);
      if (profile) results.set(handle, profile);
    }
    return results;
  }

  try {
    const response = await fetch(CULTUREX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CULTUREX_API_TOKEN}`,
      },
      body: JSON.stringify({ usernames: cleanHandles }),
    });

    if (!response.ok) {
      console.error(`CultureX batch API error: ${response.status}`);
      return results;
    }

    const data = await response.json();

    if (data.success && data.result) {
      for (const profile of data.result as CultureXProfile[]) {
        results.set(profile.username, normalizeCultureXResponse(profile));
      }
    }
  } catch (error) {
    console.error("CultureX batch API call failed:", error);
  }

  return results;
}

// ============================================================
// Mock data (deterministic based on handle)
// ============================================================

function getMockProfile(handle: string): NormalizedProfile {
  // Deterministic seed from handle
  let seed = 0;
  for (let i = 0; i < handle.length; i++) {
    seed = ((seed << 5) - seed + handle.charCodeAt(i)) | 0;
  }
  const rng = (min: number, max: number) => {
    seed = (seed * 16807) % 2147483647;
    return min + (Math.abs(seed) % (max - min + 1));
  };

  const followers = rng(5000, 500000);
  const avgViews = rng(1000, Math.floor(followers * 0.8));
  const views = Array.from({ length: 10 }, () => rng(Math.floor(avgViews * 0.5), Math.floor(avgViews * 1.5)));

  return {
    found: true,
    source: "mock",
    handle,
    name: handle.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    bio: "Creator & Influencer",
    profileImageUrl: null,
    email: null,
    phone: null,
    isVerified: false,
    category: "Digital creator",
    igFollowerCount: followers,
    igFollowingCount: rng(200, 2000),
    igPostCount: rng(50, 500),
    igEngagementRate: parseFloat((rng(10, 80) / 10).toFixed(2)),
    igAvgLikes: rng(500, 10000),
    igAvgComments: rng(10, 500),
    igAvgReelViews: avgViews,
    igAvgStoryViews: null,
    igMedianReelViews: calculateMedian(views),
    igLast8ReelViews: views.slice(0, 8),
    igCredibilityScore: null,
    igAudienceMalePct: null,
    igAudienceFemalePct: null,
    igAudienceTopAgeRange: null,
    igAudienceAgeBreakdown: null,
    igAudienceTopCities: null,
    igAudienceTopCountries: null,
    categories: ["beauty", "lifestyle"],
    tier: calculateTier(followers),
    avgVideoDuration: null,
    avgReshareCount: null,
    popularPostingDays: null,
    avgPostPerWeek: null,
    recentReels: [],
    lastUpdated: null,
  };
}
