/**
 * Builds the final Influenzer `filter` object from the UI's structured input.
 *
 * No LLM involved. Every field is explicit, sourced from a form control.
 * Dictionary names (countries, languages) are resolved to IDs/codes here
 * via the cached resolvers in ./influenzer/dictionaries.ts.
 */

import {
  resolveLocationIds,
  resolveLanguageCode,
} from "./influenzer/dictionaries";
import type { Platform, AgeGroup } from "./types";

// ============================================================
// Input shape — mirrors SearchRequestSchema.filters
// ============================================================

export interface FilterInput {
  platform: Platform;
  filters: {
    countries: string[];
    gender?: "MALE" | "FEMALE";
    followersMin?: number;
    followersMax?: number;
    engagementRateMin?: number;
    verifiedOnly?: boolean;
    lastPostedDays?: number;
    audienceAgeGroups?: AgeGroup[];
    audienceLanguage?: string;
    hashtags?: string[];
    contactRequired?: string[];
    similarToHandle?: string;
    usernameSearch?: string;
    usernameMatch?: "prefix" | "exact";
  };
}

export type FinalFilter = Record<string, unknown>;

// ============================================================
// Main
// ============================================================

export async function buildFinalFilter(
  input: FilterInput,
): Promise<FinalFilter> {
  const { platform, filters: f } = input;

  // ---- Username search short-circuit ----
  // If the user typed a handle, they're looking for that specific creator.
  // Combining it with other filters (gender, geo, hashtags, etc.) usually
  // causes 0 results — the API AND-combines all filters. So when username is
  // present we ONLY apply the username filter and drop everything else.
  // Platform is still respected via the URL path, not the filter body.
  const usernameTerm = f.usernameSearch?.trim().replace(/^@/, "");
  if (usernameTerm) {
    return {
      username: {
        value: usernameTerm,
        operator: f.usernameMatch ?? "prefix",
      },
    };
  }

  const out: FinalFilter = {};

  // ---- Geography ----
  if (f.countries.length > 0) {
    const ids = await resolveLocationIds(platform, f.countries);
    if (ids.length > 0) out.geo = ids.map((id) => ({ id }));
  }

  // ---- Creator gender ----
  if (f.gender) {
    out.gender = { code: f.gender };
  }

  // ---- Audience age (use `audience_age` — creator `age` is plan-gated) ----
  if (f.audienceAgeGroups && f.audienceAgeGroups.length > 0) {
    out.audience_age = f.audienceAgeGroups.map((code) => ({
      code,
      weight: 0.25, // API default — 25% of audience per bucket
    }));
  }

  // ---- Audience language ----
  if (f.audienceLanguage && f.audienceLanguage.trim()) {
    const code = await resolveLanguageCode(platform, f.audienceLanguage);
    if (code) out.audience_lang = { code, weight: 0.25 };
  }

  // ---- Follower range ----
  if (f.followersMin !== undefined || f.followersMax !== undefined) {
    const range: { left_number?: number; right_number?: number } = {};
    if (f.followersMin !== undefined) range.left_number = f.followersMin;
    if (f.followersMax !== undefined) range.right_number = f.followersMax;
    out.followers = range;
  }

  // ---- Engagement rate ----
  if (f.engagementRateMin !== undefined) {
    out.engagement_rate = {
      value: f.engagementRateMin,
      operator: "gte",
    };
  }

  // ---- Verified toggle ----
  if (f.verifiedOnly === true) {
    out.is_verified = true;
  }

  // ---- Last posted ----
  if (f.lastPostedDays !== undefined && f.lastPostedDays >= 30) {
    out.last_posted = f.lastPostedDays;
  }

  // ---- Hashtags → text_tags (creators who've used these hashtags) ----
  if (f.hashtags && f.hashtags.length > 0) {
    out.text_tags = f.hashtags.map((tag) => ({
      type: "hashtag" as const,
      value: tag.replace(/^#/, "").trim(), // strip # if user included it
      action: "should" as const, // OR — match creators using ANY of the tags
    }));
  }

  // ---- Required contact types ----
  if (f.contactRequired && f.contactRequired.length > 0) {
    out.with_contact = f.contactRequired.map((type) => ({
      type,
      action: "must" as const,
    }));
  }

  // ---- Lookalike to a specific creator (uses relevance with @handle) ----
  if (f.similarToHandle && f.similarToHandle.trim()) {
    const handle = f.similarToHandle.trim().replace(/^@/, "");
    out.relevance = {
      value: `@${handle}`,
      weight: 0.5,
      threshold: 0.55,
    };
  }

  return out;
}
