"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CreatorDetailResponse, Platform } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
  username: string | null;
  /** Cached summary from the search result — shown as a fallback while the
   *  rich detail call is in-flight or if it fails. */
  fallback?: {
    fullname: string;
    picture: string | null;
    followers: number;
    engagementRate: number;
    url: string;
    isVerified: boolean;
  };
}

function formatCount(n: number | null): string {
  if (n == null) return "-";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function PctBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function CreatorDetailsPanel({
  open,
  onOpenChange,
  platform,
  username,
  fallback,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [details, setDetails] = useState<CreatorDetailResponse | null>(null);

  useEffect(() => {
    if (!open || !username) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setDetails(null);

    fetch("/api/discovery/creator-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username, unlock: false }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setError(body?.error ?? `Failed (${res.status})`);
          setErrorCode(body?.code ?? null);
          return;
        }
        setDetails(body as CreatorDetailResponse);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Network error"))
      .finally(() => setLoading(false));
  }, [open, platform, username]);

  const headerName = details?.fullname ?? fallback?.fullname ?? username;
  const headerPicture = details?.picture ?? fallback?.picture ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {headerPicture ? <AvatarImage src={headerPicture} /> : null}
              <AvatarFallback>
                {(username ?? "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1 truncate">
                <span>{headerName}</span>
                {(details?.isVerified ?? fallback?.isVerified) && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                )}
              </div>
              {username && (
                <a
                  href={`https://www.instagram.com/${username}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-normal text-muted-foreground hover:underline"
                >
                  @{username}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </SheetTitle>
          <SheetDescription>
            Deep audience + content breakdown from Influenzer.ai
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading creator details…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
              <div className="font-medium text-destructive">
                {errorCode === "PROFILE_QUOTA_EXCEEDED"
                  ? "Profile-report quota exhausted"
                  : "Couldn't load details"}
              </div>
              <div className="mt-1 text-destructive/90">{error}</div>
              {errorCode === "PROFILE_QUOTA_EXCEEDED" && (
                <div className="mt-2 text-xs text-muted-foreground">
                  This quota is separate from search credits. Ask your
                  Influenzer rep to increase or reset it. In the meantime,
                  basic stats from the search result are still shown above.
                </div>
              )}
            </div>
          )}

          {/* Headline metrics — from details if available, else from fallback */}
          {(details || fallback) && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Headline</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat
                  label="Followers"
                  value={formatCount(
                    details?.followers ?? fallback?.followers ?? null,
                  )}
                />
                <Stat
                  label="Engagement rate"
                  value={
                    details?.engagementRate != null
                      ? `${(details.engagementRate * 100).toFixed(2)}%`
                      : fallback?.engagementRate != null
                        ? `${(fallback.engagementRate * 100).toFixed(2)}%`
                        : "-"
                  }
                />
                <Stat
                  label="Engagements"
                  value={formatCount(details?.engagements ?? null)}
                />
              </div>
            </section>
          )}

          {details?.bio && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Bio</h4>
              <p className="whitespace-pre-line text-xs text-muted-foreground">
                {details.bio}
              </p>
            </section>
          )}

          {/* Gender */}
          {details && (details.audienceGenderFemale != null || details.audienceGenderMale != null) && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Audience gender</h4>
              <div className="space-y-1">
                {details.audienceGenderFemale != null && (
                  <PctBar label="Female" pct={details.audienceGenderFemale} />
                )}
                {details.audienceGenderMale != null && (
                  <PctBar label="Male" pct={details.audienceGenderMale} />
                )}
              </div>
            </section>
          )}

          {/* Age */}
          {details && details.audienceAgeGroups.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Audience age</h4>
              <div className="space-y-1">
                {details.audienceAgeGroups.map((g) => (
                  <PctBar key={g.code} label={g.code} pct={g.pct} />
                ))}
              </div>
            </section>
          )}

          {/* Countries */}
          {details && details.audienceTopCountries.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top countries</h4>
              <div className="space-y-1">
                {details.audienceTopCountries.slice(0, 6).map((c) => (
                  <PctBar key={c.name} label={c.name} pct={c.pct} />
                ))}
              </div>
            </section>
          )}

          {/* Cities */}
          {details && details.audienceTopCities.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top cities</h4>
              <div className="flex flex-wrap gap-1">
                {details.audienceTopCities.slice(0, 10).map((c) => (
                  <Badge key={c.name} variant="outline">
                    {c.name} · {c.pct.toFixed(0)}%
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Reels */}
          {details &&
            (details.avgReelViews != null ||
              details.medianReelViews != null ||
              details.lastReelViews.length > 0) && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Reels</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <Stat
                    label="Avg views"
                    value={formatCount(details.avgReelViews)}
                  />
                  <Stat
                    label="Median views"
                    value={formatCount(details.medianReelViews)}
                  />
                </div>
                {details.lastReelViews.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 text-xs text-muted-foreground">
                      Last {details.lastReelViews.length} reels — views
                    </div>
                    <div className="flex items-end gap-1 rounded border p-2">
                      {details.lastReelViews.map((v, i) => {
                        const max = Math.max(...details.lastReelViews);
                        const pct = max > 0 ? (v / max) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-primary/70 text-[9px] text-primary-foreground"
                            style={{ height: `${Math.max(pct, 4)}px` }}
                            title={`${v.toLocaleString()} views`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

          {details && !loading && (
            <div className="border-t pt-3 text-xs text-muted-foreground">
              Remaining profile-report balance: {details.balance ?? "?"}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
