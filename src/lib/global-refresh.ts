import { prisma } from "@/lib/db";

// Knob you can adjust without touching API code.
// If you start blowing your Bright Data budget, lower this to e.g. 90 — it
// excludes old/dead content from the global refresh, which is the dominant
// cost driver. null = no age limit (refresh every IG asset).
export const MAX_ASSET_AGE_DAYS: number | null = null;

// Cooldowns by role. Admin can re-trigger frequently for emergencies;
// everyone else gets a longer lock so the team can't accidentally rack up
// Bright Data bills.
export const COOLDOWN_MS_BY_ROLE: Record<string, number> = {
  admin: 30 * 60 * 1000, // 30 min
  manager: 6 * 60 * 60 * 1000, // 6 hours
  user: 6 * 60 * 60 * 1000, // 6 hours
};

export const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const GLOBAL_REFRESH_SETTING_KEY = "global_metrics_refresh";

export type GlobalRefreshRecord = {
  at: string; // ISO timestamp
  byUserId: string;
  byUserRole: string;
};

export function cooldownMsForRole(role: string | null | undefined): number {
  if (!role) return DEFAULT_COOLDOWN_MS;
  return COOLDOWN_MS_BY_ROLE[role] ?? DEFAULT_COOLDOWN_MS;
}

export async function getLastGlobalRefresh(): Promise<GlobalRefreshRecord | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key: GLOBAL_REFRESH_SETTING_KEY },
  });
  if (!row) return null;
  const v = row.value as unknown;
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    typeof (v as { at?: unknown }).at !== "string"
  ) {
    return null;
  }
  const obj = v as Record<string, unknown>;
  return {
    at: obj.at as string,
    byUserId: typeof obj.byUserId === "string" ? obj.byUserId : "",
    byUserRole: typeof obj.byUserRole === "string" ? obj.byUserRole : "",
  };
}

// Atomic check-and-set: only sets the timestamp if either (a) no record
// exists, or (b) the existing record is older than the role's cooldown.
// Returns the new record on success, or null if cooldown is still active.
// Uses an interactive transaction so two simultaneous clicks can't both
// pass the check.
export async function tryClaimGlobalRefresh(
  role: string,
  byUserId: string,
): Promise<
  | { claimed: true; record: GlobalRefreshRecord; previous: GlobalRefreshRecord | null }
  | { claimed: false; existing: GlobalRefreshRecord }
> {
  const cooldownMs = cooldownMsForRole(role);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appSetting.findUnique({
      where: { key: GLOBAL_REFRESH_SETTING_KEY },
    });
    const now = new Date();
    const existingAt = parseAt(existing?.value);
    let previous: GlobalRefreshRecord | null = null;
    if (existing && existingAt) {
      const v = existing.value as Record<string, unknown>;
      previous = {
        at: existingAt.toISOString(),
        byUserId: typeof v.byUserId === "string" ? v.byUserId : "",
        byUserRole: typeof v.byUserRole === "string" ? v.byUserRole : "",
      };
    }
    if (existingAt) {
      const age = now.getTime() - existingAt.getTime();
      // Compare against the cooldown for THIS user's role. Admin can claim
      // even if last refresh was a regular user's. User cannot claim if
      // last was an admin within 6h.
      if (age < cooldownMs) {
        return { claimed: false as const, existing: previous! };
      }
    }
    const record: GlobalRefreshRecord = {
      at: now.toISOString(),
      byUserId,
      byUserRole: role,
    };
    await tx.appSetting.upsert({
      where: { key: GLOBAL_REFRESH_SETTING_KEY },
      create: {
        key: GLOBAL_REFRESH_SETTING_KEY,
        value: record as unknown as object,
        updatedBy: byUserId,
      },
      update: {
        value: record as unknown as object,
        updatedBy: byUserId,
      },
    });
    return { claimed: true as const, record, previous };
  });
}

// Restore the AppSetting row to its prior state. Called when a fresh claim
// produced zero successful refreshes — undoes the cooldown so the user can
// retry immediately instead of waiting 30 min / 6h for nothing.
export async function revertGlobalRefresh(
  previous: GlobalRefreshRecord | null,
): Promise<void> {
  if (previous) {
    await prisma.appSetting.update({
      where: { key: GLOBAL_REFRESH_SETTING_KEY },
      data: { value: previous as unknown as object },
    });
  } else {
    // No prior record → delete the row so the next claim acts as first-ever.
    await prisma.appSetting
      .delete({ where: { key: GLOBAL_REFRESH_SETTING_KEY } })
      .catch(() => {
        // Row may have been deleted concurrently — that's fine, silently swallow.
      });
  }
}

function parseAt(value: unknown): Date | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const at = (value as { at?: unknown }).at;
  if (typeof at !== "string") return null;
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeCooldownState(
  record: GlobalRefreshRecord | null,
  role: string,
): {
  lastRefreshAt: string | null;
  nextAllowedAt: string | null;
  canRefresh: boolean;
  cooldownMs: number;
  cooldownLabel: string;
} {
  const cooldownMs = cooldownMsForRole(role);
  const cooldownLabel = formatDuration(cooldownMs);
  if (!record) {
    return {
      lastRefreshAt: null,
      nextAllowedAt: null,
      canRefresh: true,
      cooldownMs,
      cooldownLabel,
    };
  }
  const lastAt = new Date(record.at);
  const next = new Date(lastAt.getTime() + cooldownMs);
  return {
    lastRefreshAt: record.at,
    nextAllowedAt: next.toISOString(),
    canRefresh: Date.now() >= next.getTime(),
    cooldownMs,
    cooldownLabel,
  };
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
