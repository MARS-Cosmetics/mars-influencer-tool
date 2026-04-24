/**
 * Dictionary resolvers for the Influenzer Filter API.
 *
 * The API's filters need numeric IDs (for locations, brand interests) and
 * ISO 639-1 codes (for languages). The LLM emits human names like "India"
 * or "Hindi" — this module calls the Influenzer dictionary endpoints and
 * caches the results in process memory.
 *
 * Cache is simple: Map<string, value>, keyed by `${platform}:${name}`.
 * Dictionaries "update rarely" per the API doc so cache-for-process-lifetime
 * is fine for this single-pod team tool. Upgrade to Redis if we scale out.
 */

import { influenzerFetch } from "./auth";
import type { Platform } from "../types";

// ============================================================
// Caches
// ============================================================

const locationCache = new Map<string, number | null>();
const languageCache = new Map<string, string | null>();

function key(platform: Platform, name: string): string {
  return `${platform}:${name.trim().toLowerCase()}`;
}

// ============================================================
// Locations
// ============================================================

interface LocationDto {
  id: number;
  name: string;
  title: string;
}

interface LocationsResponse {
  success?: boolean;
  result?: { locations?: LocationDto[] };
}

/**
 * Resolve a country/city name to an Influenzer location ID.
 * Returns null if no match found.
 *
 * Match preference: exact name → exact title substring → first result.
 */
export async function resolveLocationId(
  platform: Platform,
  name: string,
): Promise<number | null> {
  const k = key(platform, name);
  if (locationCache.has(k)) return locationCache.get(k) ?? null;

  try {
    const qp = new URLSearchParams({ query: name, limit: "5" });
    const res = await influenzerFetch(
      `/api/analytics/${platform}/locations?${qp}`,
      { method: "GET" },
    );
    if (!res.ok) {
      locationCache.set(k, null);
      return null;
    }
    const body = (await res.json()) as LocationsResponse;
    const locations = body?.result?.locations ?? [];
    if (locations.length === 0) {
      locationCache.set(k, null);
      return null;
    }

    const lower = name.trim().toLowerCase();
    const best =
      locations.find((l) => l.name.toLowerCase() === lower) ||
      locations.find((l) => l.title.toLowerCase().includes(lower)) ||
      locations[0];

    locationCache.set(k, best.id);
    return best.id;
  } catch (err) {
    console.error(`[discovery] resolveLocationId failed for "${name}":`, err);
    locationCache.set(k, null);
    return null;
  }
}

export async function resolveLocationIds(
  platform: Platform,
  names: string[],
): Promise<number[]> {
  const results = await Promise.all(
    names.map((n) => resolveLocationId(platform, n)),
  );
  return results.filter((id): id is number => id !== null);
}

// ============================================================
// Languages
// ============================================================

interface LanguageDto {
  code: string;
  name: string;
}

interface LanguagesResponse {
  success?: boolean;
  result?: { languages?: LanguageDto[] };
}

/**
 * Resolve a language name to its ISO 639-1 code. Null if no match.
 *
 * Also accepts the code itself ("en", "hi") — returns it directly if valid-looking.
 */
export async function resolveLanguageCode(
  platform: Platform,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  // if the LLM already gave us a 2-letter code, trust it
  if (/^[a-z]{2}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const k = key(platform, trimmed);
  if (languageCache.has(k)) return languageCache.get(k) ?? null;

  try {
    const qp = new URLSearchParams({ query: trimmed, limit: "10" });
    const res = await influenzerFetch(
      `/api/analytics/${platform}/languages?${qp}`,
      { method: "GET" },
    );
    if (!res.ok) {
      languageCache.set(k, null);
      return null;
    }
    const body = (await res.json()) as LanguagesResponse;
    const languages = body?.result?.languages ?? [];
    if (languages.length === 0) {
      languageCache.set(k, null);
      return null;
    }

    const lower = trimmed.toLowerCase();
    const best =
      languages.find((l) => l.name.toLowerCase() === lower) ||
      languages.find((l) => l.name.toLowerCase().startsWith(lower)) ||
      languages[0];

    languageCache.set(k, best.code);
    return best.code;
  } catch (err) {
    console.error(`[discovery] resolveLanguageCode failed for "${name}":`, err);
    languageCache.set(k, null);
    return null;
  }
}
