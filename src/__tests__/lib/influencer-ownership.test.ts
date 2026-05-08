import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  assertCanClaim,
  findExistingByHandles,
  lookupManagedByForHandles,
  InfluencerOwnedByOtherError,
} from "@/lib/influencer-ownership";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";
const INFLUENCER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// findExistingByHandles
// ============================================================

describe("findExistingByHandles", () => {
  it("returns null when no handles are provided", async () => {
    const result = await findExistingByHandles({});
    expect(result).toBeNull();
    expect(prismaMock.influencer.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when all handles are empty strings", async () => {
    const result = await findExistingByHandles({
      instagramHandle: "",
      youtubeHandle: null,
      twitterHandle: undefined,
    });
    expect(result).toBeNull();
    expect(prismaMock.influencer.findFirst).not.toHaveBeenCalled();
  });

  it("queries with OR across only the handles that were provided", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce(null);
    await findExistingByHandles({
      instagramHandle: "therebelkid",
      youtubeHandle: "rebelkid",
    });
    const args = prismaMock.influencer.findFirst.mock.calls[0]?.[0] as {
      where: { OR: Array<Record<string, unknown>> };
    };
    expect(args.where.OR).toHaveLength(2);
    expect(args.where.OR[0]).toEqual({
      instagramHandle: { equals: "therebelkid", mode: "insensitive" },
    });
    expect(args.where.OR[1]).toEqual({
      youtubeHandle: { equals: "rebelkid", mode: "insensitive" },
    });
  });

  it("strips @ prefix and lowercases the handle before querying", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce(null);
    await findExistingByHandles({ instagramHandle: "@TheRebelKid" });
    const args = prismaMock.influencer.findFirst.mock.calls[0]?.[0] as {
      where: { OR: Array<Record<string, { equals: string }>> };
    };
    expect(args.where.OR[0].instagramHandle.equals).toBe("therebelkid");
  });
});

// ============================================================
// assertCanClaim — the lock decision
// ============================================================

describe("assertCanClaim", () => {
  it("returns null when nothing matches → caller proceeds with create", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce(null);
    const result = await assertCanClaim(
      { instagramHandle: "newcreator" },
      USER_A,
    );
    expect(result).toBeNull();
  });

  it("throws InfluencerOwnedByOtherError when locked by a different user", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce({
      id: INFLUENCER_ID,
      name: "Rebel Kid",
      instagramHandle: "therebelkid",
      ownerId: USER_A,
      ownedAt: new Date("2026-04-01T10:00:00Z"),
      owner: {
        id: USER_A,
        name: "Priya Sharma",
        email: "priya@mars.in",
      },
    });

    await expect(
      assertCanClaim({ instagramHandle: "therebelkid" }, USER_B),
    ).rejects.toBeInstanceOf(InfluencerOwnedByOtherError);

    // Re-run to inspect the error fields
    prismaMock.influencer.findFirst.mockResolvedValueOnce({
      id: INFLUENCER_ID,
      name: "Rebel Kid",
      instagramHandle: "therebelkid",
      ownerId: USER_A,
      ownedAt: new Date("2026-04-01T10:00:00Z"),
      owner: { id: USER_A, name: "Priya Sharma", email: "priya@mars.in" },
    });
    let caught: InfluencerOwnedByOtherError | null = null;
    try {
      await assertCanClaim({ instagramHandle: "therebelkid" }, USER_B);
    } catch (e) {
      caught = e as InfluencerOwnedByOtherError;
    }
    expect(caught).not.toBeNull();
    expect(caught?.influencerId).toBe(INFLUENCER_ID);
    expect(caught?.ownerName).toBe("Priya Sharma");
    expect(caught?.ownerEmail).toBe("priya@mars.in");
    expect(caught?.ownedAt).toBe("2026-04-01T10:00:00.000Z");
  });

  it("returns existingId (redirect) when current user is the owner", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce({
      id: INFLUENCER_ID,
      name: "Rebel Kid",
      instagramHandle: "therebelkid",
      ownerId: USER_A,
      ownedAt: new Date(),
      owner: { id: USER_A, name: "Priya", email: "priya@mars.in" },
    });
    const result = await assertCanClaim(
      { instagramHandle: "therebelkid" },
      USER_A,
    );
    expect(result).toEqual({ existingId: INFLUENCER_ID });
  });

  it("returns existingId (redirect) for legacy unowned rows — no surprise lock", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce({
      id: INFLUENCER_ID,
      name: "Legacy Influencer",
      instagramHandle: "legacy",
      ownerId: null,
      ownedAt: null,
      owner: null,
    });
    const result = await assertCanClaim(
      { instagramHandle: "legacy" },
      USER_B,
    );
    expect(result).toEqual({ existingId: INFLUENCER_ID });
  });

  it("matches insensitively — '@TheRebelKid' clashes with stored 'therebelkid'", async () => {
    prismaMock.influencer.findFirst.mockResolvedValueOnce({
      id: INFLUENCER_ID,
      name: "Rebel Kid",
      instagramHandle: "therebelkid",
      ownerId: USER_A,
      ownedAt: new Date(),
      owner: { id: USER_A, name: "Priya", email: "priya@mars.in" },
    });
    await expect(
      assertCanClaim({ instagramHandle: "@TheRebelKid" }, USER_B),
    ).rejects.toBeInstanceOf(InfluencerOwnedByOtherError);
  });
});

// ============================================================
// lookupManagedByForHandles — search-results badge feed
// ============================================================

describe("lookupManagedByForHandles", () => {
  it("returns an empty map when no handles are passed", async () => {
    const map = await lookupManagedByForHandles([]);
    expect(map.size).toBe(0);
    expect(prismaMock.influencer.findMany).not.toHaveBeenCalled();
  });

  it("dedupes input handles and lowercases them before querying", async () => {
    prismaMock.influencer.findMany.mockResolvedValueOnce([]);
    await lookupManagedByForHandles([
      "TheRebelKid",
      "@therebelkid",
      "another",
    ]);
    const args = prismaMock.influencer.findMany.mock.calls[0]?.[0] as {
      where: { instagramHandle: { in: string[]; mode: "insensitive" } };
    };
    // Only 2 unique handles after normalization
    expect(args.where.instagramHandle.in.sort()).toEqual([
      "another",
      "therebelkid",
    ]);
  });

  it("returns a map keyed by normalized handle with owner info", async () => {
    prismaMock.influencer.findMany.mockResolvedValueOnce([
      {
        id: INFLUENCER_ID,
        instagramHandle: "TheRebelKid",
        ownerId: USER_A,
        ownedAt: new Date("2026-04-01T10:00:00Z"),
        owner: { id: USER_A, name: "Priya", email: "priya@mars.in" },
      },
    ]);
    const map = await lookupManagedByForHandles(["@therebelkid"]);
    const entry = map.get("therebelkid");
    expect(entry).toEqual({
      influencerId: INFLUENCER_ID,
      ownerId: USER_A,
      ownerName: "Priya",
      ownerEmail: "priya@mars.in",
      ownedAt: "2026-04-01T10:00:00.000Z",
    });
  });

  it("includes legacy unowned rows in the map (ownerId null) so UI can decide", async () => {
    prismaMock.influencer.findMany.mockResolvedValueOnce([
      {
        id: INFLUENCER_ID,
        instagramHandle: "legacy",
        ownerId: null,
        ownedAt: null,
        owner: null,
      },
    ]);
    const map = await lookupManagedByForHandles(["legacy"]);
    expect(map.get("legacy")).toEqual({
      influencerId: INFLUENCER_ID,
      ownerId: null,
      ownerName: null,
      ownerEmail: null,
      ownedAt: null,
    });
  });
});
