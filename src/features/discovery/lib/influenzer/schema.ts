/**
 * Zod schemas mirroring the Influenzer Filter API.
 *
 * Two shapes live here:
 *
 *   1. SemanticFilterSchema  — what the LLM is asked to emit.
 *      Uses NAMES (e.g. "India", "Hindi") and convenient shorthand,
 *      not dictionary IDs.
 *
 *   2. InfluenzerFilterSchema — the shape actually sent to the API.
 *      Dictionary names have been resolved to IDs.
 *
 * Keep both in sync with /Users/.../Downloads/Creator Discovery API Doc (1).pdf.
 */

import { z } from "zod";

// ============================================================
// Shared enums
// ============================================================

export const PlatformEnum = z.enum(["instagram", "youtube", "tiktok"]);

// Per PDF: creator-side gender accepts MALE, FEMALE, KNOWN, UNKNOWN.
// Audience-side gender accepts only MALE, FEMALE.
export const GenderEnum = z.enum(["MALE", "FEMALE", "KNOWN", "UNKNOWN"]);
export const AudienceGenderEnum = z.enum(["MALE", "FEMALE"]);

// Note: 13-17 exists on the API but we deliberately exclude it from the
// discovery feature UI — influencer marketing to minors needs extra review.
export const AgeGroupEnum = z.enum([
  "18-24",
  "25-34",
  "35-44",
  "45-64",
  "65-",
]);

export const NumericOperatorEnum = z.enum(["lt", "lte", "gt", "gte"]);

export const ActionEnum = z.enum(["must", "should", "not"]);

// ============================================================
// 1. SemanticFilter — what the LLM emits
//    Uses strings (names) instead of dictionary IDs where relevant.
// ============================================================

export const SemanticFilterSchema = z
  .object({
    // platform override — only set if the user's prompt explicitly names a
    // different platform (e.g. "YouTube gamers" when the UI had Instagram selected)
    platformOverride: PlatformEnum.optional(),

    filter: z
      .object({
        // range filters
        followers: z
          .object({
            left_number: z.number().int().nonnegative().optional(),
            right_number: z.number().int().positive().optional(),
          })
          .optional(),

        engagements: z
          .object({
            left_number: z.number().int().nonnegative().optional(),
            right_number: z.number().int().positive().optional(),
          })
          .optional(),

        engagement_rate: z
          .object({
            value: z.number().min(0).max(100),
            operator: NumericOperatorEnum.default("gte"),
          })
          .optional(),

        // growth
        followers_growth: z
          .object({
            value: z.number(),
            interval: z
              .enum([
                "i1month",
                "i2months",
                "i3months",
                "i4months",
                "i5months",
                "i6months",
              ])
              .default("i1month"),
            operator: NumericOperatorEnum.default("gte"),
          })
          .optional(),

        // creator demographics (UI quick-filter supplies MALE/FEMALE; LLM should not emit this)
        gender: z.object({ code: AudienceGenderEnum }).optional(),
        age: z
          .object({
            left_number: z.number().int(),
            right_number: z.number().int(),
          })
          .optional(),

        // names (resolver will convert to dict IDs)
        geo_names: z.array(z.string()).max(20).optional(),
        lang_name: z.string().optional(),

        // audience demographics
        audience_gender: z
          .object({
            code: AudienceGenderEnum,
            weight: z.number().min(0).max(1).default(0.5),
          })
          .optional(),

        audience_age: z
          .array(
            z.object({
              code: AgeGroupEnum,
              weight: z.number().min(0).max(1).default(0.25),
            }),
          )
          .optional(),

        audience_geo_names: z
          .array(
            z.object({
              name: z.string(),
              weight: z.number().min(0).max(1).default(0.25),
            }),
          )
          .max(20)
          .optional(),

        audience_lang_name: z
          .object({
            name: z.string(),
            weight: z.number().min(0).max(1).default(0.5),
          })
          .optional(),

        // relevance / topic matching
        relevance: z
          .object({
            value: z.string(), // hashtags / mentions / free text
            weight: z.number().min(0).max(1).default(0.5),
            threshold: z.number().min(0).max(1).default(0.55),
          })
          .optional(),

        audience_relevance: z
          .object({
            value: z.string(),
            weight: z.number().min(0).max(1).default(0.5),
          })
          .optional(),

        // text / keywords
        text: z.string().optional(), // bio/name search
        keywords: z.string().optional(), // post keywords

        // text_tags — hashtag / mention presence. MUCH looser + more useful
        // than `relevance` for broad topic queries like "fashion creators".
        text_tags: z
          .array(
            z.object({
              type: z.enum([
                "hashtag",
                "mention",
                "text_mention",
                "photo_mention",
              ]),
              value: z.string(), // without # or @ prefix
              action: ActionEnum.default("should"),
            }),
          )
          .max(20)
          .optional(),

        // flags
        is_verified: z.boolean().optional(),
        is_hidden: z.boolean().optional(),
        has_audience_data: z.boolean().optional(),
        last_posted: z.number().int().min(30).optional(),

        // contacts
        with_contact: z
          .array(
            z.object({
              type: z.enum([
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
              action: ActionEnum.default("should"),
            }),
          )
          .optional(),
      })
      .default({}),

    reasoning: z.string().optional(), // logged only, never shown
  })
  .strict();

export type SemanticFilter = z.infer<typeof SemanticFilterSchema>;

// ============================================================
// 2. InfluenzerFilter — the final shape sent to the API
//    (after dictionary resolution)
// ============================================================

export const InfluenzerFilterRequestSchema = z.object({
  sort: z.object({
    field: z.string().default("followers"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    id: z.number().nullable().default(null),
  }),
  paging: z.object({
    limit: z.number().int().min(1).max(100).default(15),
    skip: z.number().int().min(0).default(0),
  }),
  audience_source: z
    .enum(["any", "likers", "followers", "commenters"])
    .default("any"),
  filter: z.record(z.string(), z.unknown()).default({}),
  filter_type: z.string().optional(),
});

export type InfluenzerFilterRequest = z.infer<
  typeof InfluenzerFilterRequestSchema
>;
