/**
 * Influenzer.ai Filter API — authentication + shared fetch wrapper.
 *
 * Server-side only. Never import from a "use client" file.
 *
 * Auth: POST /api/authentication/login → bearer token (Firebase-style, ~1h TTL).
 * Cached in memory, auto-refreshed on 401.
 *
 * NOTE: this is intentionally a separate client from src/lib/creatorx.ts
 * even though the login flow is similar. Keeping it isolated inside
 * src/features/discovery/ means the discovery feature has no external
 * dependencies besides `@/lib/db`, making it trivial to remove.
 */

// NOTE: the API doc says server-test.influenzer.ai but MARS's test account
// actually lives on server-test-2. The CREATORX_BASE_URL env var overrides.
const BASE_URL =
  process.env.CREATORX_BASE_URL || "https://server-test-2.influenzer.ai";
const EMAIL = process.env.CREATORX_EMAIL;
const PASSWORD = process.env.CREATORX_PASSWORD;
const ACCOUNT_TYPE = (process.env.CREATORX_ACCOUNT_TYPE || "agency") as
  | "agency"
  | "creator"
  | "brand";
const FETCH_TIMEOUT_MS = 30_000; // searches can be slow
const TOKEN_TTL_MS = 55 * 60 * 1000; // refresh a bit before 1h expiry

export function isInfluenzerConfigured(): boolean {
  return Boolean(EMAIL && PASSWORD);
}

export class InfluenzerError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "InfluenzerError";
  }
}

interface CachedToken {
  token: string;
  sessionId: string; // from data.sessionId — used for x-session-id header
  expiresAt: number;
}

let cached: CachedToken | null = null;
let inflightLogin: Promise<CachedToken> | null = null;

async function login(): Promise<CachedToken> {
  if (!EMAIL || !PASSWORD) {
    throw new InfluenzerError(
      "Influenzer not configured: set CREATORX_EMAIL and CREATORX_PASSWORD",
      500,
    );
  }

  const res = await fetch(`${BASE_URL}/api/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      account_type: ACCOUNT_TYPE,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new InfluenzerError(
      `Influenzer login failed: ${res.status}`,
      res.status,
      text.slice(0, 500),
    );
  }

  const data = (await res.json()) as {
    success?: boolean;
    data?: {
      token?: string;
      sessionId?: string;
      user?: { uuid?: string };
    };
  };

  const token = data?.data?.token;
  // The actual API returns data.sessionId (a short token), which is the
  // value the server expects in the x-session-id header. The doc says to use
  // data.user.uuid but that results in 401 SESSION_INVALID. Prefer sessionId
  // with uuid as a last-resort fallback.
  const sessionId = data?.data?.sessionId ?? data?.data?.user?.uuid;

  if (!token || !sessionId) {
    throw new InfluenzerError(
      "Influenzer login response missing token or sessionId",
      500,
    );
  }

  const entry: CachedToken = {
    token,
    sessionId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  cached = entry;
  return entry;
}

async function getAuth(): Promise<CachedToken> {
  if (cached && cached.expiresAt > Date.now()) return cached;
  if (inflightLogin) return inflightLogin;
  inflightLogin = login().finally(() => {
    inflightLogin = null;
  });
  return inflightLogin;
}

/**
 * Authenticated fetch against the Influenzer API.
 * Handles 401 → re-login + retry once.
 *
 * Per the doc, every request needs:
 *   Authorization: Bearer <token>
 *   x-session-id: <user uuid>
 *   Origin: testing.influenzer.io
 */
export async function influenzerFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const attempt = async (auth: CachedToken) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${auth.token}`);
    headers.set("x-session-id", auth.sessionId);
    headers.set("Origin", "testing.influenzer.io");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  };

  let auth = await getAuth();
  let res = await attempt(auth);

  if (res.status === 401) {
    cached = null;
    auth = await getAuth();
    res = await attempt(auth);
  }

  return res;
}
