"use client";

import { toast } from "sonner";
import { Trash2, BarChart3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DiscoveryBookmarkDto } from "../lib/types";

interface Props {
  bookmarks: DiscoveryBookmarkDto[];
  loading: boolean;
  onRemove: (bookmarkId: string) => Promise<void>;
  onViewDetails?: (bookmark: DiscoveryBookmarkDto) => void;
}

export function BookmarksList({
  bookmarks,
  loading,
  onRemove,
  onViewDetails,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Loading bookmarks…
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        No bookmarks yet for this campaign. Search and hit the bookmark button on
        a creator card.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((b) => {
        const p = b.profileSnapshot;
        return (
          <Card key={b.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {p?.picture ? <AvatarImage src={p.picture} /> : null}
                <AvatarFallback>
                  {b.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <a
                  href={p?.url ?? `#`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-semibold hover:underline"
                >
                  @{b.username}
                </a>
                <div className="text-xs text-muted-foreground">
                  {b.platform}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  try {
                    await onRemove(b.id);
                    toast.success("Removed bookmark");
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Failed to remove",
                    );
                  }
                }}
                aria-label="Remove bookmark"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {p && (
              <div className="flex flex-wrap gap-1 text-xs">
                <Badge variant="outline">
                  {(p.followers ?? 0).toLocaleString()} followers
                </Badge>
                <Badge variant="outline">
                  {((p.engagementRate ?? 0) * 100).toFixed(2)}% ER
                </Badge>
              </div>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 w-full"
                onClick={() => onViewDetails(b)}
              >
                <BarChart3 className="mr-2 h-3 w-3" />
                View details
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
