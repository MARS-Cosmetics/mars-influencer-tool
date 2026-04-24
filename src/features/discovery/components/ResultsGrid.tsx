"use client";

import { toast } from "sonner";
import type { CreatorResult, Platform, DiscoveryBookmarkDto } from "../lib/types";
import { CreatorCard } from "./CreatorCard";

interface Props {
  creators: CreatorResult[];
  platform: Platform;
  bookmarks: DiscoveryBookmarkDto[];
  bookmarkedIds: Set<string>;
  onAdd: (args: { platform: Platform; creator: CreatorResult }) => Promise<void>;
  onRemove: (bookmarkId: string) => Promise<void>;
  onViewDetails: (creator: CreatorResult) => void;
}

export function ResultsGrid({
  creators,
  platform,
  bookmarks,
  bookmarkedIds,
  onAdd,
  onRemove,
  onViewDetails,
}: Props) {
  if (creators.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No creators matched. Try relaxing your prompt or quick filters.
      </div>
    );
  }

  const findBookmarkId = (externalUserId: string): string | null => {
    const b = bookmarks.find((x) => x.externalUserId === externalUserId);
    return b?.id ?? null;
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {creators.map((c) => (
        <CreatorCard
          key={c.userId}
          creator={c}
          isBookmarked={bookmarkedIds.has(c.userId)}
          onBookmark={async () => {
            try {
              await onAdd({ platform, creator: c });
              toast.success(`Bookmarked @${c.username}`);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to bookmark",
              );
            }
          }}
          onUnbookmark={async () => {
            const id = findBookmarkId(c.userId);
            if (!id) return;
            try {
              await onRemove(id);
              toast.success(`Removed bookmark`);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to remove",
              );
            }
          }}
          onViewDetails={() => onViewDetails(c)}
        />
      ))}
    </div>
  );
}
