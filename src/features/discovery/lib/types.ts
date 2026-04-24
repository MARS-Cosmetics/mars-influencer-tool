/**
 * Shared types for the discovery feature.
 * Kept small and framework-agnostic so components and server code can both use it.
 */

export type Platform = "instagram" | "youtube" | "tiktok";

export type AgeGroup = "18-24" | "25-34" | "35-44" | "45-64" | "65-";

export type Gender = "MALE" | "FEMALE";

/**
 * Full structured filter state from the discovery UI.
 * Maps 1:1 to SearchRequestSchema.filters in searchService.ts.
 */
export interface DiscoveryFilters {
  countries: string[];
  gender?: Gender;
  followersMin?: number;
  followersMax?: number;
  engagementRateMin?: number;
  verifiedOnly?: boolean;
  lastPostedDays?: number;
  audienceAgeGroups?: AgeGroup[];
  audienceLanguage?: string;
  hashtags?: string[];
  contactRequired?: ContactType[];
  similarToHandle?: string;
  /** Username filter — find a specific creator by handle or handle-prefix. */
  usernameSearch?: string;
  usernameMatch?: "prefix" | "exact";
}

// ============================================================
// Creator detail (audience breakdown + reels) — rich profile
// ============================================================

export interface CreatorDetailResponse {
  handle: string;
  platform: Platform;
  // Headline
  fullname: string | null;
  picture: string | null;
  bio: string | null;
  isVerified: boolean;
  // Core metrics
  followers: number | null;
  following: number | null;
  posts: number | null;
  engagements: number | null;
  engagementRate: number | null;
  // Audience
  audienceGenderMale: number | null;
  audienceGenderFemale: number | null;
  audienceAgeGroups: Array<{ code: string; pct: number }>;
  audienceTopCountries: Array<{ name: string; pct: number }>;
  audienceTopCities: Array<{ name: string; pct: number }>;
  // Reels / content
  avgReelViews: number | null;
  medianReelViews: number | null;
  lastReelViews: number[]; // most-recent first
  // Meta
  balance: number | null;
}

export type ContactType =
  | "email"
  | "phone"
  | "instagram"
  | "facebook"
  | "twitter"
  | "youtube"
  | "tiktok"
  | "snapchat"
  | "telegram"
  | "whatsapp"
  | "linktree"
  | "threads";

/**
 * A single creator as returned from Influenzer's /search/filter endpoint,
 * normalized for UI consumption.
 */
export interface CreatorResult {
  userId: string;
  username: string;
  fullname: string;
  url: string;
  picture: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followers: number;
  engagements: number;
  engagementRate: number;
}

export interface SearchResponse {
  total: number;
  creators: CreatorResult[];
  pagination: {
    hasNextPage: boolean;
    currentPage: number;
    nextPage: number | null;
    totalPages: number;
  };
  balance: number | null;
  /** Echo of the final filter sent to Influenzer — useful for "no results" debugging. */
  _debug?: {
    filter: Record<string, unknown>;
    platform: string;
  };
}

export interface DiscoveryBookmarkDto {
  id: string;
  campaignId: string;
  platform: Platform;
  externalUserId: string;
  username: string;
  profileSnapshot: CreatorResult;
  note: string | null;
  createdAt: string;
}
