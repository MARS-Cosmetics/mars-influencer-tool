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
    <div className="space-y-6">
      {/* Header row: campaign + platform */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="df-campaign">Campaign</Label>
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
          {campaignsError && (
            <p className="text-xs text-destructive">{campaignsError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="df-platform">Platform</Label>
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
      </div>

      {/* Two columns: filters on left, results on right (stacked on mobile) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <div>
          <FilterPanel
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
          <div className="mt-4">
            <Button onClick={onSearch} disabled={!canSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching…" : "Search creators"}
            </Button>
          </div>
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
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {results.total.toLocaleString()} total matches — showing{" "}
                    {results.creators.length}
                  </span>
                  {results.balance !== null && (
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      Credits: {results.balance.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {!results && !loading && (
                <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                  Adjust the filters on the left and click Search.
                </div>
              )}

              {results && (
                <ResultsGrid
                  creators={results.creators}
                  platform={platform}
                  bookmarks={bookmarks}
                  bookmarkedIds={bookmarkedIds}
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
