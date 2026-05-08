"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ExternalLink, Mail, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type {
  BrandAffinityEntry,
  CreatorDetailResponse,
  CreatorReelPreview,
  NamedPct,
  Platform,
  StatHistoryPoint,
} from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
  username: string | null;
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
      <span className="w-28 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function ChipList({ items, max = 12 }: { items: NamedPct[]; max?: number }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((it) => (
        <Badge key={it.name} variant="outline" className="font-normal">
          {it.name}
          {it.pct > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
              {it.pct.toFixed(1)}%
            </span>
          )}
        </Badge>
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-12 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-primary/70"
          style={{ height: `${(v / max) * 100}%`, minHeight: "2px" }}
          title={v.toLocaleString()}
        />
      ))}
    </div>
  );
}

function ReelGrid({ reels }: { reels: CreatorReelPreview[] }) {
  if (reels.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {reels.map((r, i) => (
        <a
          key={(r.url ?? "") + i}
          href={r.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-md border bg-muted"
        >
          {r.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.thumbnail}
              alt={r.caption?.slice(0, 40) ?? "reel"}
              className="aspect-square w-full object-cover transition-opacity group-hover:opacity-80"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-[10px] text-muted-foreground">
              no preview
            </div>
          )}
          <div className="p-1.5 text-[10px] tabular-nums">
            <span className="font-medium">{formatCount(r.views)}</span>
            <span className="text-muted-foreground"> views</span>
          </div>
        </a>
      ))}
    </div>
  );
}

function BrandAffinityList({
  items,
  max = 12,
}: {
  items: BrandAffinityEntry[];
  max?: number;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((b) => (
        <Badge key={b.name} variant="secondary" className="font-normal">
          {b.name}
          <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
            {b.pct.toFixed(1)}%
          </span>
        </Badge>
      ))}
    </div>
  );
}

function StatHistoryChart({ points }: { points: StatHistoryPoint[] }) {
  const followerSeries = points
    .map((p) => p.followers)
    .filter((v): v is number => typeof v === "number");
  if (followerSeries.length < 2) return null;
  const first = followerSeries[0];
  const last = followerSeries[followerSeries.length - 1];
  const growthPct = first > 0 ? ((last - first) / first) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          Follower growth ({points.length}-month)
        </span>
        <span
          className={`tabular-nums font-medium ${
            growthPct >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {growthPct >= 0 ? "+" : ""}
          {growthPct.toFixed(2)}%
        </span>
      </div>
      <Sparkline values={followerSeries} />
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
        console.log("this is body from creator details page");
        console.log(body);
        
        if (!res.ok) {
          setError(body?.error ?? `Failed (${res.status})`);
          setErrorCode(body?.code ?? null);
          return;
        }
        setDetails(body as CreatorDetailResponse);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Network error"),
      )
      .finally(() => setLoading(false));
  }, [open, platform, username]);

  const headerName = details?.fullname ?? fallback?.fullname ?? username;
  const headerPicture = details?.picture ?? fallback?.picture ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-6 sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {headerPicture ? <AvatarImage src={headerPicture} /> : null}
              <AvatarFallback>
                {(username ?? "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
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
              {details?.category && (
                <Badge variant="outline" className="mt-1 font-normal">
                  {details.category}
                </Badge>
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
            </div>
          )}

          {/* Headline */}
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
                  label="Engagement"
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
                {details && (
                  <>
                    <NumStat label="Following" value={details.following} />
                    <NumStat label="Posts" value={details.posts} />
                    <NumStat label="Total views" value={details.totalViews} />
                    <NumStat label="Total likes" value={details.totalLikes} />
                    <NumStat
                      label="Total comments"
                      value={details.totalComments}
                    />
                    <NumStat label="Reels" value={details.reelsCount} />
                    <NumStat label="Avg likes" value={details.avgLikes} />
                    <NumStat
                      label="Avg comments"
                      value={details.avgComments}
                    />
                    <NumStat label="Avg views" value={details.avgViews} />
                    <NumStat label="Avg shares" value={details.avgShares} />
                    <NumStat label="Avg saves" value={details.avgSaves} />
                    <NumStat
                      label="Avg reel views"
                      value={details.avgReelViews}
                    />
                    {details.audienceCredibility != null && (
                      <Stat
                        label="Credibility"
                        value={`${details.audienceCredibility.toFixed(0)}%`}
                      />
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Status / meta */}
          {details && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Status</h4>
              <div className="flex flex-wrap gap-1.5">
                {details.accountTypeLabel && (
                  <Badge variant="outline" className="font-normal">
                    {details.accountTypeLabel}
                  </Badge>
                )}
                {details.isVerified && (
                  <Badge variant="outline" className="font-normal">
                    Verified
                  </Badge>
                )}
                {details.isPrivate && (
                  <Badge variant="outline" className="font-normal">
                    Private
                  </Badge>
                )}
                {details.hasAds === true && (
                  <Badge variant="outline" className="font-normal">
                    Has sponsored posts
                  </Badge>
                )}
                {details.hasAudienceData === true && (
                  <Badge variant="outline" className="font-normal">
                    Audience data available
                  </Badge>
                )}
                {details.isOfficialArtist === true && (
                  <Badge variant="outline" className="font-normal">
                    Official Artist
                  </Badge>
                )}
                {details.daysSinceLastPost != null && (
                  <Badge variant="outline" className="font-normal">
                    Last posted {details.daysSinceLastPost}d ago
                  </Badge>
                )}
              </div>
            </section>
          )}

          {/* Creator demographics */}
          {details &&
            (details.creatorGender ||
              details.creatorAge ||
              details.creatorGeoCountry ||
              details.creatorGeoCity ||
              details.creatorLang) && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Creator profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {details.creatorGender && (
                    <KV label="Gender" value={details.creatorGender} />
                  )}
                  {details.creatorAge && (
                    <KV label="Age" value={details.creatorAge} />
                  )}
                  {details.creatorGeoCountry && (
                    <KV label="Country" value={details.creatorGeoCountry} />
                  )}
                  {details.creatorGeoCity && (
                    <KV label="City" value={details.creatorGeoCity} />
                  )}
                  {details.creatorLang && (
                    <KV label="Language" value={details.creatorLang} />
                  )}
                </div>
              </section>
            )}

          {/* Social handles */}
          {details &&
            Object.values(details.socialHandles).some((v) => v) && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Other socials</h4>
                <div className="space-y-1 text-xs">
                  {(
                    Object.entries(details.socialHandles) as [
                      keyof typeof details.socialHandles,
                      string | null,
                    ][]
                  )
                    .filter(([, v]) => Boolean(v))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 capitalize text-muted-foreground">
                          {k}
                        </span>
                        <span className="truncate">{v}</span>
                      </div>
                    ))}
                </div>
              </section>
            )}

          {/* Bio */}
          {details?.bio && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Bio</h4>
              <p className="whitespace-pre-line text-xs text-muted-foreground">
                {details.bio}
              </p>
            </section>
          )}

          {/* Contact */}
          {details &&
            (details.publicEmail || details.publicPhone || details.externalUrl) && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Contact</h4>
                <div className="space-y-1 text-xs">
                  {details.publicEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={`mailto:${details.publicEmail}`}
                        className="hover:underline"
                      >
                        {details.publicEmail}
                      </a>
                    </div>
                  )}
                  {details.publicPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {details.publicPhone}
                    </div>
                  )}
                  {details.externalUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={details.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:underline"
                      >
                        {details.externalUrl}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

          {/* Audience gender */}
          {details &&
            (details.audienceGenderFemale != null ||
              details.audienceGenderMale != null) && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Audience gender</h4>
                <div className="space-y-1">
                  {details.audienceGenderFemale != null && (
                    <PctBar
                      label="Female"
                      pct={details.audienceGenderFemale}
                    />
                  )}
                  {details.audienceGenderMale != null && (
                    <PctBar label="Male" pct={details.audienceGenderMale} />
                  )}
                </div>
              </section>
            )}

          {/* Audience age */}
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

          {/* Audience credibility */}
          {details && details.audienceCredibility != null && (
            <section>
              <h4 className="mb-1 text-sm font-semibold">Audience credibility</h4>
              <p className="text-xs text-muted-foreground">
                Score{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {details.audienceCredibility.toFixed(1)}%
                </span>
                {details.audienceCredibilityClass && (
                  <span className="ml-2">
                    (
                    <span className="capitalize">
                      {details.audienceCredibilityClass}
                    </span>
                    )
                  </span>
                )}
              </p>
            </section>
          )}

          {/* Top countries */}
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

          {/* Top states */}
          {details && details.audienceTopStates.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top states</h4>
              <ChipList items={details.audienceTopStates} max={10} />
            </section>
          )}

          {/* Top cities */}
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

          {/* Audience languages */}
          {details && details.audienceLanguages.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Audience languages</h4>
              <ChipList items={details.audienceLanguages} max={8} />
            </section>
          )}

          {/* Audience ethnicities */}
          {details && details.audienceEthnicities.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Audience ethnicities</h4>
              <ChipList items={details.audienceEthnicities} max={6} />
            </section>
          )}

          {/* Audience brand affinity */}
          {details && details.audienceBrandAffinity.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">
                Audience brand affinity
              </h4>
              <BrandAffinityList items={details.audienceBrandAffinity} />
            </section>
          )}

          {/* Audience interests */}
          {details && details.audienceInterests.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Audience interests</h4>
              <ChipList items={details.audienceInterests} />
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
                    <Sparkline values={details.lastReelViews} />
                  </div>
                )}
              </section>
            )}

          {/* Recent reels */}
          {details && details.recentReels.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Recent reels</h4>
              <ReelGrid reels={details.recentReels} />
            </section>
          )}

          {/* Top reels */}
          {details && details.popularReels.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top reels</h4>
              <ReelGrid reels={details.popularReels} />
            </section>
          )}

          {/* Hashtags */}
          {details && details.hashtags.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top hashtags</h4>
              <ChipList items={details.hashtags} max={20} />
            </section>
          )}

          {/* Mentions */}
          {details && details.mentions.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Top mentions</h4>
              <ChipList items={details.mentions} max={20} />
            </section>
          )}

          {/* Keywords */}
          {details && details.keywords.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Keywords</h4>
              <ChipList items={details.keywords} max={20} />
            </section>
          )}

          {/* Brand affinity */}
          {details && details.brandAffinity.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Brand affinity</h4>
              <BrandAffinityList items={details.brandAffinity} />
            </section>
          )}

          {/* Interests */}
          {details && details.interests.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Interests</h4>
              <ChipList items={details.interests} />
            </section>
          )}

          {/* Recent posts (non-reel) */}
          {details && details.recentPosts.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Recent posts</h4>
              <ReelGrid reels={details.recentPosts} />
            </section>
          )}

          {/* Sponsored posts */}
          {details && details.sponsoredPosts.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Sponsored posts</h4>
              <ReelGrid reels={details.sponsoredPosts} />
            </section>
          )}

          {/* Growth */}
          {details && details.statHistory.length > 1 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold">Growth</h4>
              <StatHistoryChart points={details.statHistory} />
              {details.growth.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {details.growth.map((g) => (
                    <div
                      key={g.intervalMonths}
                      className="rounded-lg border bg-card p-2"
                    >
                      <div className="text-[11px] text-muted-foreground">
                        {g.intervalMonths}-month
                      </div>
                      {g.followersPct != null && (
                        <div
                          className={`text-sm font-semibold tabular-nums ${
                            g.followersPct >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {g.followersPct >= 0 ? "+" : ""}
                          {g.followersPct.toFixed(2)}%
                        </div>
                      )}
                      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                        {g.likesPct != null && (
                          <div>
                            likes {g.likesPct >= 0 ? "+" : ""}
                            {g.likesPct.toFixed(1)}%
                          </div>
                        )}
                        {g.viewsPct != null && (
                          <div>
                            views {g.viewsPct >= 0 ? "+" : ""}
                            {g.viewsPct.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {details && !loading && (
            <div className="border-t pt-3 text-xs text-muted-foreground">
              Profile-report balance remaining: {details.balance ?? "?"}
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
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function NumStat({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  if (value == null || value <= 0) return null;
  return <Stat label={label} value={formatCount(value)} />;
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
