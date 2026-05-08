import { prisma } from "@/lib/db";

export interface ManagedByInfo {
  influencerId: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownedAt: string | null;
}

const HANDLE_FIELDS = [
  "instagramHandle",
  "youtubeHandle",
  "twitterHandle",
  "tiktokHandle",
  "snapchatHandle",
] as const;

type HandleField = (typeof HANDLE_FIELDS)[number];

function normalize(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const trimmed = handle.trim().replace(/^@/, "").toLowerCase();
  return trimmed || null;
}

export async function findExistingByHandles(handles: {
  instagramHandle?: string | null;
  youtubeHandle?: string | null;
  twitterHandle?: string | null;
  tiktokHandle?: string | null;
  snapchatHandle?: string | null;
}) {
  const conditions: Array<Record<string, { equals: string; mode: "insensitive" }>> = [];
  for (const field of HANDLE_FIELDS) {
    const v = normalize(handles[field as HandleField] ?? null);
    if (v) conditions.push({ [field]: { equals: v, mode: "insensitive" } });
  }
  if (conditions.length === 0) return null;

  return prisma.influencer.findFirst({
    where: { OR: conditions },
    select: {
      id: true,
      name: true,
      instagramHandle: true,
      ownerId: true,
      ownedAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Lookup which external creators (by instagram handle) are already in our DB
 * and who manages them. Used to badge search results without per-card queries.
 */
export async function lookupManagedByForHandles(
  instagramHandles: string[],
): Promise<Map<string, ManagedByInfo>> {
  const normalized = Array.from(
    new Set(
      instagramHandles
        .map((h) => normalize(h))
        .filter((h): h is string => Boolean(h)),
    ),
  );
  if (normalized.length === 0) return new Map();

  const rows = await prisma.influencer.findMany({
    where: {
      instagramHandle: { in: normalized, mode: "insensitive" },
    },
    select: {
      id: true,
      instagramHandle: true,
      ownerId: true,
      ownedAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  const map = new Map<string, ManagedByInfo>();
  for (const r of rows) {
    const key = normalize(r.instagramHandle);
    if (!key) continue;
    map.set(key, {
      influencerId: r.id,
      ownerId: r.ownerId,
      ownerName: r.owner?.name ?? null,
      ownerEmail: r.owner?.email ?? null,
      ownedAt: r.ownedAt ? r.ownedAt.toISOString() : null,
    });
  }
  return map;
}

export class InfluencerOwnedByOtherError extends Error {
  constructor(
    public readonly influencerId: string,
    public readonly influencerName: string | null,
    public readonly ownerName: string | null,
    public readonly ownerEmail: string | null,
    public readonly ownedAt: string | null,
  ) {
    super(`Influencer is managed by ${ownerName ?? "another user"}`);
    this.name = "InfluencerOwnedByOtherError";
  }
}

export class InfluencerAlreadyExistsError extends Error {
  constructor(
    public readonly influencerId: string,
    public readonly influencerName: string | null,
  ) {
    super("Influencer already exists");
    this.name = "InfluencerAlreadyExistsError";
  }
}

/**
 * Throws if a different user already owns an influencer with one of the
 * submitted handles. Returns null if creation should proceed normally,
 * or an existing-influencer pointer if a non-owned record already exists
 * (caller can redirect to the existing record instead of creating a dupe).
 */
export async function assertCanClaim(
  handles: Parameters<typeof findExistingByHandles>[0],
  currentUserId: string | null,
): Promise<{ existingId: string } | null> {
  const existing = await findExistingByHandles(handles);
  if (!existing) return null;

  if (existing.ownerId && existing.ownerId !== currentUserId) {
    throw new InfluencerOwnedByOtherError(
      existing.id,
      existing.name,
      existing.owner?.name ?? null,
      existing.owner?.email ?? null,
      existing.ownedAt ? existing.ownedAt.toISOString() : null,
    );
  }

  // Same handle but no owner (legacy row) OR same user re-claiming —
  // surface to caller so it redirects rather than creating a duplicate.
  return { existingId: existing.id };
}
