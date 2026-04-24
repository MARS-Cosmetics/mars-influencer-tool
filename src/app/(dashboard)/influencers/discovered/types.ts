/**
 * Shared types for the Discovered page + its client components.
 * Kept server-safe (no React, no client-only imports).
 */

import type { BookmarkStatus } from "@/generated/prisma";

export const SORT_KEYS = ["createdAt", "followers", "engagement"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const ALL_STATUSES: readonly BookmarkStatus[] = [
  "new",
  "contacted",
  "responded",
  "shortlisted",
  "declined",
  "rejected",
] as const;

/** Profile snapshot shape — mirrors what /discover writes as `profileSnapshot`. */
export interface SnapshotShape {
  fullname?: string;
  picture?: string | null;
  url?: string;
  followers?: number;
  engagements?: number;
  engagementRate?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  userId?: string;
  username?: string;
}

/** Row passed from Server Component → Client table. */
export interface BookmarkRow {
  id: string;
  username: string;
  platform: string;
  status: BookmarkStatus;
  note: string | null;
  createdAt: string; // ISO string (Server → Client transfer)
  profileSnapshot: SnapshotShape;
  campaign: {
    name: string;
    brand: { name: string } | null;
  } | null;
}

export const STATUS_COLORS: Record<BookmarkStatus, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  responded: "bg-cyan-100 text-cyan-700",
  shortlisted: "bg-green-100 text-green-700",
  declined: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<BookmarkStatus, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  shortlisted: "Shortlisted",
  declined: "Declined",
  rejected: "Rejected",
};
