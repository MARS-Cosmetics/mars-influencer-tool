/**
 * Bright Data Web Scraper API client — Instagram Post + Reel datasets.
 *
 * Server-side only. Never import this from a "use client" file.
 *
 * Uses the synchronous /datasets/v3/scrape endpoint. One HTTP call → response
 * already contains the scraped rows. No polling, no snapshot_id.
 *   POST https://api.brightdata.com/datasets/v3/scrape
 *        ?dataset_id=...&include_errors=true&notify=false
 *   body: {"input":[{"url":"..."}]}
 *
 * Public API:
 *   isBrightDataConfigured()                 → true when env vars are set
 *   fetchInstagramPostMetrics(contentUrl)    → BrightDataMetrics | throws
 */

const BASE_URL = process.env.BRIGHTDATA_BASE_URL || "https://api.brightdata.com";
const API_TOKEN = process.env.BRIGHTDATA_API_TOKEN;
const IG_POST_DATASET_ID = process.env.BRIGHTDATA_IG_POST_DATASET_ID;
// Optional — if not set, reels are scraped through the post dataset. Many of
// Bright Data's IG datasets accept both /p/ and /reel/ URLs.
const IG_REEL_DATASET_ID =
  process.env.BRIGHTDATA_IG_REEL_DATASET_ID || process.env.BRIGHTDATA_IG_POST_DATASET_ID;
// Profile dataset (separate from post/reel). Returns followers, engagement,
// bio, posts list, etc. Used as a fallback when CreatorX/Influenzer can't
// answer for a handle.
const IG_PROFILE_DATASET_ID = process.env.BRIGHTDATA_IG_PROFILE_DATASET_ID;

// Instagram scrapes through /scrape can take 30s–3min on cold cache.
// Set fetch timeout generously; the route layer can cap its own deadline.
const SCRAPE_TIMEOUT_MS = 180_000;

export function isBrightDataConfigured(): boolean {
  return Boolean(API_TOKEN && IG_POST_DATASET_ID);
}

export class BrightDataError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "BrightDataError";
  }
}

export type BrightDataAudio = {
  title: string | null;
  artist: string | null;
  isOriginalAudio: boolean | null;
};

export type BrightDataMetrics = {
  // "views" matches what Instagram displays publicly = video_play_count
  // (includes replays). Bright Data also returns a smaller `video_view_count`
  // (unique viewers) — surfaced separately below for future analytics.
  views: number | null;
  uniqueViews: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  // Extras surfaced from the scrape payload. Stored on Asset.brightDataSnapshot
  // and rendered in the Post Metadata card. Any of these may be null.
  caption: string | null;
  hashtags: string[];
  audio: BrightDataAudio | null;
  videoDurationSec: number | null;
  isPaidPartnership: boolean | null;
  datePosted: string | null;
  contentTypeLabel: string | null;
  thumbnail: string | null;
  source: "brightdata";
  contentKind: "post" | "reel";
  raw: Record<string, unknown>;
};

type IgContentKind = "post" | "reel";

function detectContentKind(url: string): IgContentKind | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const p = u.pathname.toLowerCase();
    if (p.includes("/reel/") || p.includes("/reels/")) return "reel";
    if (p.includes("/p/") || p.includes("/tv/")) return "post";
    return null;
  } catch {
    return null;
  }
}

async function scrapeSync(
  datasetId: string,
  urls: string[],
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    dataset_id: datasetId,
    include_errors: "true",
    notify: "false",
  });
  const res = await fetch(`${BASE_URL}/datasets/v3/scrape?${qs.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: urls.map((url) => ({ url })) }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BrightDataError(
      `Bright Data scrape failed (${res.status})`,
      res.status,
      text.slice(0, 500),
    );
  }
  // Bright Data /scrape returns NDJSON (one JSON object per line) when the
  // request has multiple inputs. For a single input it sometimes returns one
  // bare object — both formats must work. Read as text and parse line-by-line
  // when the whole-body JSON.parse fails.
  const text = await res.text();
  return parseBrightDataResponse(text);
}

function parseBrightDataResponse(text: string): Record<string, unknown>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Happy path: single JSON value (array, object, or {data: [...]} wrapper).
  try {
    const body = JSON.parse(trimmed) as unknown;
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
      const wrapped = body as { data?: unknown; results?: unknown };
      if (Array.isArray(wrapped.data)) return wrapped.data as Record<string, unknown>[];
      if (Array.isArray(wrapped.results)) return wrapped.results as Record<string, unknown>[];
      return [body as Record<string, unknown>];
    }
    return [];
  } catch {
    // Fall through to NDJSON parsing below.
  }

  // NDJSON: one JSON object per line. Lines may be split by \n, \r\n, or even
  // a sequence of multiple objects with no separators (rare but seen). We
  // walk the string with JSON.parse's reviver-less behavior to extract
  // sequential JSON values robustly.
  const rows: Record<string, unknown>[] = [];

  // Fast path: split on newlines first.
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let lineParseFailed = false;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line.trim()) as Record<string, unknown>;
      if (obj && typeof obj === "object") rows.push(obj);
    } catch {
      lineParseFailed = true;
      break;
    }
  }
  if (!lineParseFailed && rows.length > 0) return rows;

  // Last-ditch: walk the raw text and decode sequential JSON values without
  // requiring newline separators. Handles concatenated JSON objects.
  rows.length = 0;
  let i = 0;
  while (i < trimmed.length) {
    // Skip whitespace/separators
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    if (i >= trimmed.length) break;
    // Walk a balanced JSON value starting at trimmed[i]. Only handles objects
    // (`{`) and arrays (`[`); anything else means malformed input.
    const start = i;
    const opener = trimmed[i];
    if (opener !== "{" && opener !== "[") break;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    if (depth !== 0) break;
    const chunk = trimmed.slice(start, i);
    try {
      const parsed = JSON.parse(chunk) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed as Record<string, unknown>[]) {
          if (item && typeof item === "object") rows.push(item);
        }
      } else if (parsed && typeof parsed === "object") {
        rows.push(parsed as Record<string, unknown>);
      }
    } catch {
      break;
    }
  }
  return rows;
}

// Best-effort URL normalization for matching response rows back to the input
// list. Strips trailing slash and lowercases host. Bright Data IG responses
// typically echo the original URL, but minor differences (trailing /, www.)
// occasionally appear.
function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    return `${url.protocol}//${host}${path}`;
  } catch {
    return u.trim().toLowerCase().replace(/\/$/, "");
  }
}

function extractRowUrl(row: Record<string, unknown>): string | null {
  // Direct fields
  const direct = pickString(row, "url", "post_url", "input_url", "source_url");
  if (direct) return direct;
  // input: {url: ...} echoed back on error rows
  const input = row.input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const url = (input as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function extractAudio(row: Record<string, unknown>): BrightDataAudio | null {
  const audio = row.audio;
  if (!audio || typeof audio !== "object" || Array.isArray(audio)) return null;
  const a = audio as Record<string, unknown>;
  const title = pickString(a, "original_audio_title", "title", "track_name");
  const artist = pickString(a, "ig_artist_username", "artist_name", "artist");
  const isOriginal =
    typeof a.is_original_audio === "boolean" ? a.is_original_audio : null;
  if (title === null && artist === null && isOriginal === null) return null;
  return { title, artist, isOriginalAudio: isOriginal };
}

function extractVideoDurationSec(row: Record<string, unknown>): number | null {
  // Real shape: videos_duration: [{url, video_duration: 18.1}]
  const vd = row.videos_duration;
  if (Array.isArray(vd) && vd.length > 0) {
    for (const entry of vd) {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.video_duration === "number") return e.video_duration;
        if (typeof e.duration === "number") return e.duration;
      }
    }
  }
  // Some dataset variants put a flat number on the row.
  return pickNumber(row, "video_duration", "duration", "duration_sec");
}

function extractHashtags(row: Record<string, unknown>): string[] {
  const h = row.hashtags;
  if (!Array.isArray(h)) return [];
  const out: string[] = [];
  for (const item of h) {
    if (typeof item === "string" && item.trim() !== "") out.push(item);
    else if (item && typeof item === "object") {
      const tag = (item as Record<string, unknown>).tag;
      if (typeof tag === "string" && tag.trim() !== "") out.push(tag);
    }
  }
  return out;
}

function normalize(row: Record<string, unknown>, kind: IgContentKind): BrightDataMetrics {
  // Bright Data field names vary between datasets and over time. Try every
  // plausible key for each metric.
  // Instagram's public "X views" label on a reel = total plays (replays
  // included). That's video_play_count. video_view_count is a smaller
  // unique-viewer figure. Prefer plays so our UI matches what users see on IG.
  const views = pickNumber(
    row,
    "video_play_count",
    "play_count",
    "plays",
    "videoPlayCount",
    "video_view_count",
    "views",
    "view_count",
    "videoViewCount",
  );
  const uniqueViews = pickNumber(
    row,
    "video_view_count",
    "view_count",
    "videoViewCount",
    "unique_view_count",
  );
  const likes = pickNumber(
    row,
    "likes",
    "likes_count",
    "like_count",
    "num_likes",
    "likesCount",
  );
  const comments = pickNumber(
    row,
    "num_comments",
    "comments_count",
    "comments",
    "comment_count",
    "commentsCount",
  );
  const shares = pickNumber(
    row,
    "shares",
    "share_count",
    "num_shares",
    "reshare_count",
    "sharesCount",
  );
  return {
    views,
    uniqueViews,
    likes,
    comments,
    shares,
    caption: pickString(row, "description", "caption", "text"),
    hashtags: extractHashtags(row),
    audio: extractAudio(row),
    videoDurationSec: extractVideoDurationSec(row),
    isPaidPartnership: pickBool(row, "is_paid_partnership", "isPaidPartnership"),
    datePosted: pickString(row, "date_posted", "datePosted", "posted_at", "timestamp"),
    contentTypeLabel: pickString(row, "content_type", "contentType", "product_type"),
    thumbnail: pickString(row, "thumbnail", "thumbnail_url", "image_url"),
    source: "brightdata",
    contentKind: kind,
    raw: row,
  };
}

export async function fetchInstagramPostMetrics(
  contentUrl: string,
): Promise<BrightDataMetrics> {
  if (!isBrightDataConfigured()) {
    throw new BrightDataError(
      "Bright Data not configured. Set BRIGHTDATA_API_TOKEN and BRIGHTDATA_IG_POST_DATASET_ID.",
      503,
    );
  }
  const kind = detectContentKind(contentUrl);
  if (!kind) {
    throw new BrightDataError(
      "URL is not a recognized Instagram post or reel URL",
      400,
    );
  }
  const datasetId = kind === "reel" ? IG_REEL_DATASET_ID! : IG_POST_DATASET_ID!;
  const rows = await scrapeSync(datasetId, [contentUrl]);
  const first = rows[0];
  if (!first || typeof first !== "object") {
    throw new BrightDataError("Bright Data returned an empty result for this URL", 502);
  }
  // Surface scraper-side errors. Bright Data sometimes returns a row with an
  // `error` / `warning` field instead of the scraped fields — treat that as
  // a 502 so the UI shows the underlying reason.
  const errMsg =
    typeof (first as { error?: unknown }).error === "string"
      ? ((first as { error?: string }).error as string)
      : typeof (first as { warning?: unknown }).warning === "string"
        ? ((first as { warning?: string }).warning as string)
        : null;
  if (errMsg && pickNumber(first, "likes", "likes_count", "views", "video_view_count") === null) {
    throw new BrightDataError(`Bright Data error for this URL: ${errMsg}`, 502);
  }
  return normalize(first, kind);
}

// ============================================================
// Batch fetch — multiple URLs in a single Bright Data /scrape call.
// ============================================================
//
// Sends URLs grouped by dataset (post vs reel) in parallel. Returns a map
// keyed by the ORIGINAL input URL with either the metrics or an Error. Never
// throws — per-URL failures are surfaced as Error values in the map so the
// caller can decide which assets to update vs leave untouched.

export type BatchResult = { metrics: BrightDataMetrics } | { error: Error };

export async function fetchInstagramPostMetricsBatch(
  urls: string[],
): Promise<Map<string, BatchResult>> {
  const out = new Map<string, BatchResult>();

  if (!isBrightDataConfigured()) {
    const err = new BrightDataError(
      "Bright Data not configured. Set BRIGHTDATA_API_TOKEN and BRIGHTDATA_IG_POST_DATASET_ID.",
      503,
    );
    for (const u of urls) out.set(u, { error: err });
    return out;
  }

  // Group URLs by dataset. Skip URLs we can't classify (non-IG, malformed).
  const postUrls: string[] = [];
  const reelUrls: string[] = [];
  for (const u of urls) {
    const kind = detectContentKind(u);
    if (kind === "post") postUrls.push(u);
    else if (kind === "reel") reelUrls.push(u);
    else {
      out.set(u, {
        error: new BrightDataError(
          "URL is not a recognized Instagram post or reel URL",
          400,
        ),
      });
    }
  }

  const groups: { kind: IgContentKind; datasetId: string; urls: string[] }[] = [];
  if (postUrls.length > 0) {
    groups.push({ kind: "post", datasetId: IG_POST_DATASET_ID!, urls: postUrls });
  }
  if (reelUrls.length > 0) {
    // If reel and post share the same dataset, the post-group call already
    // handles both. Otherwise issue a separate call.
    if (IG_REEL_DATASET_ID === IG_POST_DATASET_ID && postUrls.length > 0) {
      // Merge reels into the post call so we only make one HTTP request.
      groups[0].urls.push(...reelUrls);
    } else {
      groups.push({
        kind: "reel",
        datasetId: IG_REEL_DATASET_ID!,
        urls: reelUrls,
      });
    }
  }

  // Run groups in parallel. Each group is one /scrape call.
  await Promise.all(
    groups.map(async (g) => {
      let rows: Record<string, unknown>[];
      try {
        rows = await scrapeSync(g.datasetId, g.urls);
      } catch (e) {
        const err =
          e instanceof Error
            ? e
            : new BrightDataError(`Bright Data scrape failed: ${String(e)}`, 502);
        for (const u of g.urls) out.set(u, { error: err });
        return;
      }

      // Match rows back to input URLs by their echoed URL field. Fall back
      // to position if URL match fails (some datasets may not echo URL on
      // every row).
      const inputByNorm = new Map<string, string>();
      for (const u of g.urls) inputByNorm.set(normalizeUrl(u), u);

      const matched = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || typeof row !== "object") continue;
        const rowUrl = extractRowUrl(row);
        let inputUrl: string | null = null;
        if (rowUrl) {
          const norm = normalizeUrl(rowUrl);
          inputUrl = inputByNorm.get(norm) ?? null;
        }
        // Positional fallback — only safe if no URL match AND the row index
        // hasn't already been consumed by a URL-matched assignment. Best
        // effort.
        if (!inputUrl && i < g.urls.length && !matched.has(g.urls[i])) {
          inputUrl = g.urls[i];
        }
        if (!inputUrl) continue;
        matched.add(inputUrl);

        // Detect error rows for this input.
        const errMsg =
          typeof (row as { error?: unknown }).error === "string"
            ? ((row as { error?: string }).error as string)
            : typeof (row as { warning?: unknown }).warning === "string"
              ? ((row as { warning?: string }).warning as string)
              : null;
        const hasNumericMetric =
          pickNumber(row, "likes", "likes_count", "views", "video_view_count") !==
          null;
        if (errMsg && !hasNumericMetric) {
          out.set(inputUrl, {
            error: new BrightDataError(
              `Bright Data error for this URL: ${errMsg}`,
              502,
            ),
          });
          continue;
        }
        out.set(inputUrl, { metrics: normalize(row, g.kind) });
      }

      // Any input URL not matched at all → record as not-returned error so
      // the caller knows it didn't get refreshed.
      for (const u of g.urls) {
        if (!out.has(u)) {
          out.set(u, {
            error: new BrightDataError(
              "Bright Data did not return a result for this URL",
              502,
            ),
          });
        }
      }
    }),
  );

  return out;
}

// ============================================================
// Instagram Profile fetch — fallback for CreatorX / Influenzer.ai
// ============================================================
//
// Returns null on configuration miss or when the profile isn't returned.
// Throws BrightDataError on auth / network / billing failures so the caller
// can decide whether to surface or silently fall through.

export interface BrightDataIgProfile {
  // Subset of NormalizedProfile fields Bright Data can fill. Audience
  // demographics / credibility are NOT in the basic IG profile dataset —
  // those stay null and must come from CreatorX or a paid endpoint.
  handle: string;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  isVerified: boolean;
  email: string | null;
  category: string | null;
  igFollowerCount: number | null;
  igFollowingCount: number | null;
  igPostCount: number | null;
  igEngagementRate: number | null; // 0–100 percent (normalized)
  igAvgLikes: number | null;
  igAvgComments: number | null;
  igAvgReelViews: number | null;
  raw: Record<string, unknown>;
}

export function isBrightDataProfileConfigured(): boolean {
  return Boolean(API_TOKEN && IG_PROFILE_DATASET_ID);
}

export async function fetchInstagramProfileFromBrightData(
  handle: string,
): Promise<BrightDataIgProfile | null> {
  if (!isBrightDataProfileConfigured()) return null;
  const username = handle.replace(/^@/, "").trim();
  if (!username) return null;

  const url = `https://www.instagram.com/${username}/`;
  let rows: Record<string, unknown>[];
  try {
    rows = await scrapeSync(IG_PROFILE_DATASET_ID!, [url]);
  } catch (e) {
    // Surface auth / billing / network errors so the caller can decide.
    // 404 / dead_page is handled below by checking the row content.
    if (e instanceof BrightDataError) throw e;
    throw new BrightDataError(
      `Bright Data profile fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      502,
    );
  }

  const first = rows[0];
  if (!first || typeof first !== "object") return null;

  // Some responses come back as { error, error_code, input } for dead /
  // private / unknown handles. Treat those as not-found, not an error.
  if (typeof first.error === "string" && first.followers == null) return null;

  const followers = pickNumber(
    first,
    "followers",
    "follower_count",
    "followers_count",
  );
  const following = pickNumber(
    first,
    "following",
    "following_count",
    "followings",
  );
  const posts = pickNumber(first, "posts_count", "post_count", "posts");
  const avgEngagementRaw = pickNumber(
    first,
    "avg_engagement",
    "engagement_rate",
    "engagementRate",
  );
  // avg_engagement comes as 0–1 fraction; convert to percent for consistency
  // with how the rest of the app stores engagement rate.
  const engagementRatePct =
    avgEngagementRaw == null
      ? null
      : avgEngagementRaw <= 1
        ? avgEngagementRaw * 100
        : avgEngagementRaw;

  // Compute avg likes / comments / reel views from the posts array if present.
  let avgLikes: number | null = null;
  let avgComments: number | null = null;
  let avgReelViews: number | null = null;
  const postsArr = Array.isArray(first.posts) ? first.posts : null;
  if (postsArr && postsArr.length > 0) {
    let lSum = 0;
    let lCount = 0;
    let cSum = 0;
    let cCount = 0;
    let vSum = 0;
    let vCount = 0;
    for (const p of postsArr) {
      if (!p || typeof p !== "object") continue;
      const post = p as Record<string, unknown>;
      const lk = pickNumber(post, "likes", "like_count");
      const cm = pickNumber(post, "comments", "num_comments", "comment_count");
      const vw = pickNumber(post, "video_play_count", "video_view_count");
      if (lk != null) {
        lSum += lk;
        lCount += 1;
      }
      if (cm != null) {
        cSum += cm;
        cCount += 1;
      }
      if (vw != null) {
        vSum += vw;
        vCount += 1;
      }
    }
    if (lCount > 0) avgLikes = Math.round(lSum / lCount);
    if (cCount > 0) avgComments = Math.round(cSum / cCount);
    if (vCount > 0) avgReelViews = Math.round(vSum / vCount);
  }

  return {
    handle: username,
    name:
      pickString(first, "full_name", "fullname", "name", "profile_name") ??
      null,
    bio: pickString(first, "biography", "bio") ?? null,
    profileImageUrl:
      pickString(first, "profile_image_link", "profile_picture", "picture") ??
      null,
    isVerified: typeof first.is_verified === "boolean" ? first.is_verified : Boolean(first.isVerified),
    email: pickString(first, "email_address", "email") ?? null,
    category:
      pickString(first, "category_name", "business_category_name") ?? null,
    igFollowerCount: followers,
    igFollowingCount: following,
    igPostCount: posts,
    igEngagementRate: engagementRatePct,
    igAvgLikes: avgLikes,
    igAvgComments: avgComments,
    igAvgReelViews: avgReelViews,
    raw: first,
  };
}
