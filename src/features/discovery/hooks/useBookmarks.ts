"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CreatorResult,
  DiscoveryBookmarkDto,
  Platform,
} from "../lib/types";

interface UseBookmarksReturn {
  bookmarks: DiscoveryBookmarkDto[];
  loading: boolean;
  error: string | null;
  /** set of externalUserId strings for O(1) isBookmarked() lookups */
  bookmarkedIds: Set<string>;
  refresh: () => Promise<void>;
  add: (params: {
    platform: Platform;
    creator: CreatorResult;
  }) => Promise<void>;
  remove: (bookmarkId: string) => Promise<void>;
}

/**
 * Campaign-scoped bookmarks hook. Pass the active campaignId.
 * The hook re-fetches whenever campaignId changes.
 */
export function useBookmarks(campaignId: string | null): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<DiscoveryBookmarkDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setBookmarks([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/discovery/bookmark?campaignId=${encodeURIComponent(campaignId)}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Failed to load bookmarks");
        return;
      }
      setBookmarks(body as DiscoveryBookmarkDto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async ({ platform, creator }: { platform: Platform; creator: CreatorResult }) => {
      if (!campaignId) return;
      const res = await fetch("/api/discovery/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          platform,
          externalUserId: creator.userId,
          username: creator.username,
          profileSnapshot: creator,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to bookmark");
      }
      await refresh();
    },
    [campaignId, refresh],
  );

  const remove = useCallback(
    async (bookmarkId: string) => {
      const res = await fetch(`/api/discovery/bookmark/${bookmarkId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to remove bookmark");
      }
      await refresh();
    },
    [refresh],
  );

  const bookmarkedIds = new Set(bookmarks.map((b) => b.externalUserId));

  return { bookmarks, loading, error, bookmarkedIds, refresh, add, remove };
}
