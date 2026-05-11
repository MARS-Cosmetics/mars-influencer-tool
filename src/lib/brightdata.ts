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
  url: string,
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
    body: JSON.stringify({ input: [{ url }] }),
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
  const body = (await res.json()) as unknown;
  // /scrape returns the raw rows directly. Some Bright Data endpoints wrap
  // the rows in an object — handle both just in case.
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object") {
    const wrapped = body as { data?: unknown; results?: unknown };
    if (Array.isArray(wrapped.data)) return wrapped.data as Record<string, unknown>[];
    if (Array.isArray(wrapped.results)) return wrapped.results as Record<string, unknown>[];
    // Single record returned as an object
    return [body as Record<string, unknown>];
  }
  return [];
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
  const rows = await scrapeSync(datasetId, contentUrl);
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
