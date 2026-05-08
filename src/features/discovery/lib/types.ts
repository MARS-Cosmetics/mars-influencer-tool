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

export interface CreatorReelPreview {
  url: string | null;
  thumbnail: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  caption: string | null;
  postedAt: string | null;
}

export interface NamedPct {
  name: string;
  pct: number;
}

export interface CodedPct {
  code: string;
  pct: number;
}

export interface BrandAffinityEntry {
  name: string;
  pct: number;
  category?: string | null;
}

export interface StatHistoryPoint {
  month: string;
  followers: number | null;
  following: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
}

export interface SocialHandles {
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  snapchat: string | null;
  telegram: string | null;
  whatsapp: string | null;
  linktree: string | null;
  threads: string | null;
}

export interface GrowthDelta {
  intervalMonths: number;
  followersPct: number | null;
  likesPct: number | null;
  viewsPct: number | null;
}

export interface CreatorDetailResponse {
  handle: string;
  platform: Platform;
  // Headline
  fullname: string | null;
  picture: string | null;
  bio: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  category: string | null;
  externalUrl: string | null;
  accountType: string | null;
  accountTypeLabel: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  socialHandles: SocialHandles;
  // Core metrics
  followers: number | null;
  following: number | null;
  posts: number | null;
  totalViews: number | null;
  totalLikes: number | null;
  totalComments: number | null;
  engagements: number | null;
  engagementRate: number | null;
  reelsCount: number | null;
  // Status flags
  hasAds: boolean | null;
  hasAudienceData: boolean | null;
  isOfficialArtist: boolean | null;
  lastPostedAt: string | null;
  daysSinceLastPost: number | null;
  // Creator's own demographics (when API surfaces it)
  creatorGender: string | null;
  creatorAge: string | null;
  creatorGeoCountry: string | null;
  creatorGeoCity: string | null;
  creatorLang: string | null;
  // Audience demographics
  audienceGenderMale: number | null;
  audienceGenderFemale: number | null;
  audienceCredibility: number | null; // 0-100
  audienceCredibilityClass: string | null;
  audienceAgeGroups: CodedPct[];
  audienceTopCountries: NamedPct[];
  audienceTopCities: NamedPct[];
  audienceTopStates: NamedPct[];
  audienceLanguages: NamedPct[];
  audienceEthnicities: NamedPct[];
  audienceBrandAffinity: BrandAffinityEntry[];
  audienceInterests: NamedPct[];
  // Content (per-creator)
  hashtags: NamedPct[];
  mentions: NamedPct[];
  keywords: NamedPct[];
  brandAffinity: BrandAffinityEntry[];
  interests: NamedPct[];
  // Reels / content stats
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  avgShares: number | null;
  avgSaves: number | null;
  avgReelViews: number | null;
  medianReelViews: number | null;
  lastReelViews: number[]; // most-recent first
  recentReels: CreatorReelPreview[];
  popularReels: CreatorReelPreview[];
  recentPosts: CreatorReelPreview[];
  sponsoredPosts: CreatorReelPreview[];
  // Growth / history
  statHistory: StatHistoryPoint[];
  growth: GrowthDelta[]; // computed from statHistory at 1m/3m/6m
  cxScore: number | null;
  // Meta
  balance: number | null;
  fetchedAt: string;
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
