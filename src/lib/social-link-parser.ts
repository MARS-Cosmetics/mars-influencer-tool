export type SocialPlatform = "instagram" | "youtube" | "tiktok";

export interface ParsedSocialLink {
  platform: SocialPlatform;
  handle: string | null;
  url: string;
}

const HANDLE_RE = /^[A-Za-z0-9_.]{1,60}$/;

function cleanHandle(raw: string): string | null {
  const stripped = raw.replace(/^@/, "").trim();
  if (!stripped || !HANDLE_RE.test(stripped)) return null;
  return stripped;
}

function normaliseUrl(input: string): URL | null {
  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

function parseInstagram(u: URL): ParsedSocialLink | null {
  if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
  const seg = u.pathname.split("/").filter(Boolean)[0];
  const handle = seg ? cleanHandle(seg) : null;
  return { platform: "instagram", handle, url: u.toString() };
}

function parseYouTube(u: URL): ParsedSocialLink | null {
  const isYT = /(^|\.)youtube\.com$/i.test(u.hostname) || /(^|\.)youtu\.be$/i.test(u.hostname);
  if (!isYT) return null;
  const segs = u.pathname.split("/").filter(Boolean);
  let handle: string | null = null;
  if (segs[0]?.startsWith("@")) handle = cleanHandle(segs[0]);
  else if (segs[0] === "c" || segs[0] === "user" || segs[0] === "channel") handle = segs[1] ? cleanHandle(segs[1]) : null;
  return { platform: "youtube", handle, url: u.toString() };
}

function parseTikTok(u: URL): ParsedSocialLink | null {
  if (!/(^|\.)tiktok\.com$/i.test(u.hostname)) return null;
  const seg = u.pathname.split("/").filter(Boolean)[0];
  const handle = seg ? cleanHandle(seg) : null;
  return { platform: "tiktok", handle, url: u.toString() };
}

/**
 * Parse a URL or bare handle into a platform + handle.
 * Returns null if the input can't be identified as a supported platform.
 *
 * Accepted forms:
 *   - https://www.instagram.com/someuser
 *   - instagram.com/someuser
 *   - https://youtube.com/@someuser
 *   - https://tiktok.com/@someuser
 *   - @someuser        → defaults to instagram
 *   - someuser         → defaults to instagram (ambiguous, lowest confidence)
 */
export function parseSocialInput(raw: string): ParsedSocialLink | null {
  const input = raw.trim();
  if (!input) return null;

  // URL-like?
  if (input.includes(".") || input.includes("/")) {
    const url = normaliseUrl(input);
    if (!url) return null;
    return parseInstagram(url) ?? parseYouTube(url) ?? parseTikTok(url) ?? null;
  }

  // Bare handle → default to Instagram (most common for this tool)
  const handle = cleanHandle(input);
  if (!handle) return null;
  return {
    platform: "instagram",
    handle,
    url: `https://www.instagram.com/${handle}`,
  };
}

/**
 * Extract every URL from a block of text and parse each.
 * Useful when the suggester pastes a message with multiple links.
 */
export function parseAllSocialInputs(text: string): ParsedSocialLink[] {
  const results: ParsedSocialLink[] = [];
  const seen = new Set<string>();

  const urlMatches = text.match(/\bhttps?:\/\/\S+/gi) ?? [];
  for (const m of urlMatches) {
    const parsed = parseSocialInput(m.replace(/[.,;!?)]+$/, ""));
    if (parsed && !seen.has(parsed.url)) {
      seen.add(parsed.url);
      results.push(parsed);
    }
  }

  if (results.length > 0) return results;

  // Fallback: treat entire trimmed text as a single handle
  const single = parseSocialInput(text);
  return single ? [single] : [];
}
