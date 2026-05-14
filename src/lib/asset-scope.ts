import type { Prisma } from "@/generated/prisma";

// ============================================================
// Visibility rules
// ============================================================
//
// Admin sees everything.
// Manager and user see only:
//   - assets where the collaboration's influencer is owned by them
//     (Influencer.ownerId), OR
//   - assets where the collaboration is assigned to them
//     (Collaboration.assignedTo)
//
// Unauthenticated session → empty result (filter blocks everything).
//
// Used by analytics, dashboard, refresh-candidates, and refresh endpoints.
// Centralized so we don't duplicate ownership logic across files.
//
// To change manager scope (e.g. give managers admin-like visibility),
// edit ROLES_THAT_SEE_ALL below.

const ROLES_THAT_SEE_ALL = new Set(["admin"]);

export function canSeeAllAssets(role: string | null | undefined): boolean {
  return Boolean(role) && ROLES_THAT_SEE_ALL.has(role as string);
}

// "Their assets" definition. Used for filtering Asset queries.
export function buildAssetScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.AssetWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" }; // safety: no session → no results
  return {
    OR: [
      { collaboration: { influencer: { ownerId: userId } } },
      { collaboration: { assignedTo: userId } },
    ],
  };
}

// Same logic for Collaboration queries (dashboard "recent collabs").
export function buildCollaborationScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.CollaborationWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" };
  return {
    OR: [
      { influencer: { ownerId: userId } },
      { assignedTo: userId },
    ],
  };
}

// Same for Influencer queries (dashboard counts).
export function buildInfluencerScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.InfluencerWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" };
  return {
    OR: [
      { ownerId: userId },
      { collaborations: { some: { assignedTo: userId } } },
    ],
  };
}

// For Campaign queries (dashboard "Active Campaigns"). A user "sees" a
// campaign if they have a collab inside it (loose link) — admin sees all.
export function buildCampaignScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.CampaignWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" };
  return {
    collaborations: { some: { assignedTo: userId } },
  };
}

// For Payment queries (dashboard "Pending Payments").
export function buildPaymentScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.PaymentWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" };
  return {
    collaboration: {
      OR: [
        { influencer: { ownerId: userId } },
        { assignedTo: userId },
      ],
    },
  };
}

// For PrParcel queries (dashboard "In-Transit Parcels").
export function buildPrParcelScopeWhere(
  userId: string | null,
  role: string | null | undefined,
): Prisma.PrParcelWhereInput {
  if (canSeeAllAssets(role)) return {};
  if (!userId) return { id: "__none__" };
  return {
    collaboration: {
      OR: [
        { influencer: { ownerId: userId } },
        { assignedTo: userId },
      ],
    },
  };
}

// Server-side guard for the per-asset refresh endpoint. Returns true if the
// caller is allowed to touch the asset.
export async function userCanRefreshAsset(
  prismaClient: { asset: { findUnique: (args: { where: { id: string }; select: object }) => Promise<unknown> } },
  assetId: string,
  userId: string | null,
  role: string | null | undefined,
): Promise<boolean> {
  if (canSeeAllAssets(role)) return true;
  if (!userId) return false;
  const a = (await prismaClient.asset.findUnique({
    where: { id: assetId },
    select: {
      collaboration: {
        select: {
          assignedTo: true,
          influencer: { select: { ownerId: true } },
        },
      },
    },
  })) as { collaboration?: { assignedTo?: string; influencer?: { ownerId?: string | null } | null } } | null;
  if (!a?.collaboration) return false;
  if (a.collaboration.assignedTo === userId) return true;
  if (a.collaboration.influencer?.ownerId === userId) return true;
  return false;
}
