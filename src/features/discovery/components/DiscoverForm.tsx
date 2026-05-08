"use client";

import { useEffect, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterPanel } from "./FilterPanel";
import { ResultsGrid } from "./ResultsGrid";
import { BookmarksList } from "./BookmarksList";
import { CreatorDetailsPanel } from "./CreatorDetailsPanel";
import { useDiscoverySearch } from "../hooks/useDiscoverySearch";
import { useBookmarks } from "../hooks/useBookmarks";
import type { CreatorResult, DiscoveryFilters, Platform } from "../lib/types";

interface ManagedByInfo {
  influencerId: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownedAt: string | null;
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  countries: ["India"],
};

// ============================================================
// Campaign loader
// ============================================================

interface CampaignLite {
  id: string;
  name: string;
  brand?: { name: string } | null;
}

function useCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/campaigns?limit=200");
        if (!res.ok) {
          setError("Failed to load campaigns");
          return;
        }
        const data = (await res.json()) as { items: CampaignLite[] };
        setCampaigns(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { campaigns, loading, error };
}

// ============================================================
// Component
// ============================================================

export function DiscoverForm() {
  const { campaigns, loading: campaignsLoading, error: campaignsError } =
    useCampaigns();

  const [campaignId, setCampaignId] = useState<string>("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);

  const { loading, error, results, search } = useDiscoverySearch();
  const { bookmarks, bookmarkedIds, loading: bmLoading, add, remove } =
    useBookmarks(campaignId || null);

  // Creator details side panel
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCreator, setDetailsCreator] = useState<CreatorResult | null>(null);

  // Lookup which creators in the result set are already managed by another
  // user. One batched call after the results land — same DB, ~5ms.
  const [managedMap, setManagedMap] = useState<
    Record<string, ManagedByInfo>
  >({});

  useEffect(() => {
    if (!results || results.creators.length === 0) {
      setManagedMap({});
      return;
    }
    const handles = results.creators
      .map((c) => c.username)
      .filter((h): h is string => Boolean(h));
    if (handles.length === 0) return;
    let aborted = false;
    fetch("/api/discovery/managed-by", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handles }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { managed?: Record<string, ManagedByInfo> } | null) => {
        if (aborted || !data?.managed) return;
        setManagedMap(data.managed);
      })
      .catch(() => {
        /* non-blocking; cards just won't show the badge */
      });
    return () => {
      aborted = true;
    };
  }, [results]);

  const openDetails = (creator: CreatorResult) => {
    setDetailsCreator(creator);
    setDetailsOpen(true);
  };

  // auto-select first campaign once loaded
  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaigns, campaignId]);

  const canSearch = !loading && Boolean(campaignId);

  const onSearch = () => {
    if (!canSearch) return;
    search({ campaignId, platform, filters });
  };

  return (
    <div className="space-y-4">
      {/* Sticky action bar: campaign + platform + Search.
          Stays in view while user scrolls filters/results so they don't
          have to scroll back up to re-run the search. */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(140px,180px)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="df-campaign" className="text-xs">Campaign</Label>
            <select
              id="df-campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={campaignsLoading || campaigns.length === 0}
            >
              {campaignsLoading ? (
                <option>Loading…</option>
              ) : campaigns.length === 0 ? (
                <option>No campaigns — create one first</option>
              ) : (
                campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.brand?.name ? ` — ${c.brand.name}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="df-platform" className="text-xs">Platform</Label>
            <select
              id="df-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <Button
            onClick={onSearch}
            disabled={!canSearch}
            className="h-9 w-full sm:w-auto sm:px-6"
          >
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>

        {/* Status row — credits + error fit on one compact line */}
        {(campaignsError || (results && results.balance !== null)) && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-destructive">{campaignsError ?? ""}</span>
            {results?.balance !== null && results?.balance !== undefined && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Wallet className="h-3 w-3" />
                Credits: {results.balance.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Two columns: filters on left, results on right (stacked on mobile) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div>
          <FilterPanel
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>

        <div>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Tabs defaultValue="results">
            <TabsList>
              <TabsTrigger value="results">
                Results {results ? `(${results.creators.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="bookmarks">
                Bookmarks ({bookmarks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="mt-4 space-y-4">
              {results && (
                <div className="text-sm text-muted-foreground">
                  {results.total.toLocaleString()} total matches — showing{" "}
                  {results.creators.length}
                </div>
              )}

              {!results && !loading && (
                <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                  Pick a campaign and click Search above.
                </div>
              )}

              {results && (
                <ResultsGrid
                  creators={results.creators}
                  platform={platform}
                  bookmarks={bookmarks}
                  bookmarkedIds={bookmarkedIds}
                  managedMap={managedMap}
                  onAdd={add}
                  onRemove={remove}
                  onViewDetails={openDetails}
                />
              )}

              {results && results._debug && (
                <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    Debug — filter sent to Influenzer
                  </summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(results._debug, null, 2)}
                  </pre>
                </details>
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-4">
              <BookmarksList
                bookmarks={bookmarks}
                loading={bmLoading}
                onRemove={remove}
                onViewDetails={(b) => {
                  // Re-use the same sheet, feeding it the bookmark snapshot
                  setDetailsCreator({
                    userId: b.externalUserId,
                    username: b.username,
                    fullname: b.profileSnapshot?.fullname ?? b.username,
                    url: b.profileSnapshot?.url ?? "",
                    picture: b.profileSnapshot?.picture ?? null,
                    isVerified: Boolean(b.profileSnapshot?.isVerified),
                    isPrivate: Boolean(b.profileSnapshot?.isPrivate),
                    followers: b.profileSnapshot?.followers ?? 0,
                    engagements: b.profileSnapshot?.engagements ?? 0,
                    engagementRate: b.profileSnapshot?.engagementRate ?? 0,
                  });
                  setDetailsOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Creator deep-dive sheet — opens when user clicks "View details" */}
      <CreatorDetailsPanel
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        platform={platform}
        username={detailsCreator?.username ?? null}
        fallback={
          detailsCreator
            ? {
                fullname: detailsCreator.fullname,
                picture: detailsCreator.picture,
                followers: detailsCreator.followers,
                engagementRate: detailsCreator.engagementRate,
                url: detailsCreator.url,
                isVerified: detailsCreator.isVerified,
              }
            : undefined
        }
      />
    </div>
  );
}
