/**
 * Instagram API Client
 *
 * Auto-toggles between mock and real API based on environment variables.
 *
 * Two API modes:
 * 1. RapidAPI (scraper) — for discovery/vetting public profiles
 *    Set RAPIDAPI_KEY in .env to use real API.
 * 2. Meta Graph API — for connected influencers with OAuth
 *    Set META_APP_ID and META_APP_SECRET in .env.
 *
 * Without credentials, returns realistic mock data for development.
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

export const USE_MOCK = !RAPIDAPI_KEY;
export const USE_META_API = !!META_APP_ID;

/** Env var names needed for real API usage */
export const REQUIRED_ENV_VARS = {
  rapidApi: ["RAPIDAPI_KEY"],
  metaApi: ["META_APP_ID", "META_APP_SECRET"],
} as const;

// ============================================================
// Types
// ============================================================

export interface InstagramPublicProfile {
  username: string;
  fullName: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
}

export interface InstagramMediaItem {
  id: string;
  type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption: string | null;
  timestamp: string;
  permalink: string;
  mediaUrl: string | null;
  likeCount: number;
  commentsCount: number;
  reach?: number;
  impressions?: number;
}

export interface InstagramConnectedProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  profilePictureUrl: string | null;
}

export interface InstagramStoryInsight {
  id: string;
  timestamp: string;
  reach: number;
  impressions: number;
  replies: number;
  exits: number;
  tapsForward: number;
  tapsBack: number;
}

// ============================================================
// RapidAPI Functions (public profile scraping)
// ============================================================

export async function fetchPublicProfile(
  handle: string
): Promise<InstagramPublicProfile> {
  if (USE_MOCK) return mockPublicProfile(handle);

  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY!,
        "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`RapidAPI Instagram error (${res.status}): ${error}`);
  }

  const json = await res.json();
  const data = json.data;

  return {
    username: data.username,
    fullName: data.full_name || "",
    biography: data.biography || "",
    followerCount: data.follower_count ?? 0,
    followingCount: data.following_count ?? 0,
    postCount: data.media_count ?? 0,
    profilePicUrl: data.profile_pic_url_hd || data.profile_pic_url || null,
    isVerified: data.is_verified ?? false,
    isPrivate: data.is_private ?? false,
  };
}

// ============================================================
// Meta Graph API Functions (OAuth / connected influencers)
// ============================================================

const META_GRAPH_BASE = "https://graph.instagram.com";
const META_AUTH_BASE = "https://www.instagram.com/oauth/authorize";

export function getAuthUrl(redirectUri: string): string {
  if (!META_APP_ID) {
    throw new Error("META_APP_ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: redirectUri,
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
    response_type: "code",
  });

  return `${META_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error("META_APP_ID and META_APP_SECRET are required");
  }

  // Exchange short-lived code for short-lived token
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    throw new Error(`Instagram token exchange failed (${tokenRes.status}): ${error}`);
  }

  const tokenData = await tokenRes.json();

  // Exchange for long-lived token
  const longLivedRes = await fetch(
    `${META_GRAPH_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${META_APP_SECRET}&access_token=${tokenData.access_token}`
  );

  if (!longLivedRes.ok) {
    // Fall back to short-lived token
    return {
      accessToken: tokenData.access_token,
      userId: String(tokenData.user_id),
    };
  }

  const longLivedData = await longLivedRes.json();

  return {
    accessToken: longLivedData.access_token,
    userId: String(tokenData.user_id),
  };
}

export async function fetchConnectedProfile(
  accessToken: string
): Promise<InstagramConnectedProfile> {
  const fields =
    "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url";
  const res = await fetch(
    `${META_GRAPH_BASE}/v21.0/me?fields=${fields}&access_token=${accessToken}`
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Instagram Graph API error (${res.status}): ${error}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    username: data.username,
    name: data.name || "",
    biography: data.biography || "",
    followerCount: data.followers_count ?? 0,
    followingCount: data.follows_count ?? 0,
    mediaCount: data.media_count ?? 0,
    profilePictureUrl: data.profile_picture_url || null,
  };
}

export async function fetchRecentMedia(
  accessToken: string,
  limit = 25
): Promise<InstagramMediaItem[]> {
  const fields =
    "id,media_type,caption,timestamp,permalink,media_url,like_count,comments_count";
  const res = await fetch(
    `${META_GRAPH_BASE}/v21.0/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Instagram media fetch failed (${res.status}): ${error}`);
  }

  const data = await res.json();

  return (data.data || []).map(
    (item: Record<string, unknown>) =>
      ({
        id: item.id as string,
        type: item.media_type as InstagramMediaItem["type"],
        caption: (item.caption as string) || null,
        timestamp: item.timestamp as string,
        permalink: item.permalink as string,
        mediaUrl: (item.media_url as string) || null,
        likeCount: (item.like_count as number) ?? 0,
        commentsCount: (item.comments_count as number) ?? 0,
      }) satisfies InstagramMediaItem
  );
}

export async function fetchStoryInsights(
  accessToken: string
): Promise<InstagramStoryInsight[]> {
  // First get stories
  const storiesRes = await fetch(
    `${META_GRAPH_BASE}/v21.0/me/stories?fields=id,timestamp&access_token=${accessToken}`
  );

  if (!storiesRes.ok) {
    return [];
  }

  const storiesData = await storiesRes.json();
  const stories = storiesData.data || [];

  const insights: InstagramStoryInsight[] = [];

  for (const story of stories.slice(0, 10)) {
    try {
      const insightRes = await fetch(
        `${META_GRAPH_BASE}/v21.0/${story.id}/insights?metric=reach,impressions,replies,exits,taps_forward,taps_back&access_token=${accessToken}`
      );

      if (!insightRes.ok) continue;

      const insightData = await insightRes.json();
      const metrics = insightData.data || [];

      const getValue = (name: string) =>
        metrics.find((m: { name: string; values: { value: number }[] }) => m.name === name)
          ?.values?.[0]?.value ?? 0;

      insights.push({
        id: story.id,
        timestamp: story.timestamp,
        reach: getValue("reach"),
        impressions: getValue("impressions"),
        replies: getValue("replies"),
        exits: getValue("exits"),
        tapsForward: getValue("taps_forward"),
        tapsBack: getValue("taps_back"),
      });
    } catch {
      // Skip stories with failed insight fetches
    }
  }

  return insights;
}

// ============================================================
// Mock Data
// ============================================================

function mockPublicProfile(handle: string): InstagramPublicProfile {
  const seed = handle.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) =>
    Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * (max - min) + min);

  return {
    username: handle,
    fullName: handle
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    biography: "Beauty & Lifestyle Creator | Collaborations: DM",
    followerCount: rand(5000, 800000),
    followingCount: rand(200, 3000),
    postCount: rand(50, 1200),
    profilePicUrl: `https://placehold.co/150x150/E1306C/white?text=${encodeURIComponent(handle.charAt(0).toUpperCase())}`,
    isVerified: seed % 5 === 0,
    isPrivate: false,
  };
}
