"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  Lock,
} from "lucide-react";
import type { CreatorResult } from "../lib/types";

interface ManagedByInfo {
  influencerId: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownedAt: string | null;
}

interface Props {
  creator: CreatorResult;
  isBookmarked: boolean;
  managedBy?: ManagedByInfo | null;
  onBookmark: () => void;
  onUnbookmark: () => void;
  onViewDetails: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CreatorCard({
  creator,
  isBookmarked,
  managedBy,
  onBookmark,
  onUnbookmark,
  onViewDetails,
}: Props) {
  const lockedByOther = Boolean(managedBy?.ownerId);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          {creator.picture ? <AvatarImage src={creator.picture} /> : null}
          <AvatarFallback>
            {creator.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold">{creator.fullname || creator.username}</span>
            {creator.isVerified && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
            )}
          </div>
          <a
            href={creator.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
          >
            @{creator.username}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Button
          size="icon"
          variant={isBookmarked ? "default" : "outline"}
          onClick={isBookmarked ? onUnbookmark : onBookmark}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{formatCount(creator.followers)} followers</Badge>
        <Badge variant="outline">
          {(creator.engagementRate * 100).toFixed(2)}% ER
        </Badge>
        <Badge variant="outline">
          {formatCount(creator.engagements)} engagements
        </Badge>
        {creator.isPrivate && <Badge variant="secondary">Private</Badge>}
      </div>

      {lockedByOther && (
        <div className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Managed by{" "}
            <span className="font-medium">
              {managedBy?.ownerName ?? "another user"}
            </span>
            {managedBy?.ownerEmail ? ` (${managedBy.ownerEmail})` : ""}
          </span>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-full"
        onClick={onViewDetails}
      >
        <BarChart3 className="mr-2 h-3 w-3" />
        View details
      </Button>
    </Card>
  );
}
