/**
 * Discovery search orchestration — explicit filters only.
 *
 * Previous version used an LLM (Groq) to parse a freeform prompt into filters.
 * That was unpredictable and often over-applied filters, so it was removed.
 * The UI now exposes every relevant filter directly, and the server just
 * maps the structured request into an Influenzer-ready filter body.
 *
 * If you ever want the LLM flow back: it's in git history — restore
 * src/features/discovery/lib/llm/* and the parseFilter() call path.
 */

import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildFinalFilter, type FilterInput } from "./mergeFilters";
import { filterCreators } from "./influenzer/filter";
import { InfluenzerError, isInfluenzerConfigured } from "./influenzer/auth";
import {
  InfluenzerFilterRequestSchema,
  PlatformEnum,
  AudienceGenderEnum,
  AgeGroupEnum,
  ActionEnum,
} from "./influenzer/schema";
import type { SearchResponse } from "./types";

// ============================================================
// Request validation
// ============================================================

export const SearchRequestSchema = z.object({
  campaignId: z.string().uuid(),
  platform: PlatformEnum.default("instagram"),

  filters: z
    .object({
      // Location / demographics
      countries: z.array(z.string()).default(["India"]),
      gender: AudienceGenderEnum.optional(),

      // Creator size & quality
      followersMin: z.number().int().nonnegative().optional(),
      followersMax: z.number().int().positive().optional(),
      engagementRateMin: z.number().min(0).max(100).optional(),
      verifiedOnly: z.boolean().optional(),
      lastPostedDays: z.number().int().min(30).optional(),

      // Audience
      audienceAgeGroups: z.array(AgeGroupEnum).optional(),
      audienceLanguage: z.string().optional(), // free text → resolved to code

      // Topics
      hashtags: z.array(z.string()).max(20).optional(), // without # prefix

      // Required contact types
      contactRequired: z
        .array(
          z.enum([
            "email",
            "phone",
            "instagram",
            "facebook",
            "twitter",
            "youtube",
            "tiktok",
            "snapchat",
            "telegram",
            "whatsapp",
            "linktree",
            "threads",
          ]),
        )
        .optional(),

      // Lookalike — paste a creator's handle to find similar creators
      similarToHandle: z.string().optional(),

      // Username search — find creators by handle (prefix or exact)
      usernameSearch: z.string().optional(),
      usernameMatch: z.enum(["prefix", "exact"]).optional(),
    })
    .default({ countries: ["India"] }),

  paging: z
    .object({
      limit: z.number().int().min(1).max(100).default(15),
      skip: z.number().int().min(0).default(0),
    })
    .default({ limit: 15, skip: 0 }),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// ============================================================
// Errors
// ============================================================

export class SearchServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "SearchServiceError";
  }
}

// ============================================================
// Main orchestration
// ============================================================

export async function runDiscoverySearch(params: {
  userId: string;
  request: SearchRequest;
}): Promise<SearchResponse> {
  const { userId, request } = params;

  if (!isInfluenzerConfigured()) {
    throw new SearchServiceError(
      "Influenzer API is not configured on the server",
      500,
    );
  }

  // --- load campaign (for audit log only — filters come from the form) ---
  const campaign = await prisma.campaign.findUnique({
    where: { id: request.campaignId },
    select: { id: true },
  });
  if (!campaign) {
    throw new SearchServiceError("Campaign not found", 404);
  }

  // --- build the filter from structured input ---
  const filterInput: FilterInput = {
    platform: request.platform,
    filters: request.filters,
  };
  const finalFilter = await buildFinalFilter(filterInput);

  console.log(
    "[discovery] searching %s — filter: %s",
    request.platform,
    JSON.stringify(finalFilter),
  );

  // --- build Influenzer request body ---
  const apiBody = InfluenzerFilterRequestSchema.parse({
    sort: { field: "followers", direction: "desc", id: null },
    paging: request.paging,
    audience_source: "any",
    filter: finalFilter,
  });

  // --- call Influenzer ---
  let searchResult: SearchResponse;
  try {
    searchResult = await filterCreators(request.platform, apiBody);
  } catch (err) {
    if (err instanceof InfluenzerError) {
      if (err.status === 403) {
        throw new SearchServiceError(
          `Influenzer denied this request: ${err.message}`,
          402,
        );
      }
      if (err.status === 400 || err.status === 200) {
        console.error(
          "[discovery] Influenzer rejected filter:",
          err.body,
          "filter:",
          JSON.stringify(finalFilter),
        );
        throw new SearchServiceError(
          `Influenzer rejected the filter: ${err.message}`,
          400,
        );
      }
      throw new SearchServiceError(
        `Influenzer error (${err.status}): ${err.message}`,
        err.status === 401 ? 500 : err.status,
      );
    }
    throw new SearchServiceError("Unexpected search failure", 500);
  }

  // --- audit log (fire-and-forget) ---
  prisma.influencerSearch
    .create({
      data: {
        userId,
        campaignId: request.campaignId,
        platform: request.platform,
        userPrompt: "", // no prompt anymore — filters are structured
        generatedFilter: finalFilter as object,
        resultCount: searchResult.creators.length,
        creditsBalance: searchResult.balance ?? null,
      },
    })
    .catch((err) => console.error("[discovery] failed to log search:", err));

  // Attach the filter to the response for debug panel visibility
  return {
    ...searchResult,
    _debug: { filter: finalFilter, platform: request.platform },
  };
}

// Re-export used types / enums so route handlers can validate without
// pulling from the inner schema module directly.
export { ActionEnum };
