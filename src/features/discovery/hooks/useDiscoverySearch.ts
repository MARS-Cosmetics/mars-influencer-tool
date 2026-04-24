"use client";

import { useState, useCallback } from "react";
import type {
  DiscoveryFilters,
  Platform,
  SearchResponse,
} from "../lib/types";

interface SearchArgs {
  campaignId: string;
  platform: Platform;
  filters: DiscoveryFilters;
  paging?: { limit: number; skip: number };
}

interface UseDiscoverySearchReturn {
  loading: boolean;
  error: string | null;
  results: SearchResponse | null;
  search: (args: SearchArgs) => Promise<void>;
  reset: () => void;
}

export function useDiscoverySearch(): UseDiscoverySearchReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const search = useCallback(async (args: SearchArgs) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Search failed");
        setResults(null);
        return;
      }
      setResults(body as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { loading, error, results, search, reset };
}
