"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, X } from "lucide-react";

type FilterKey = "type" | "status" | "brand" | "campaign";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "brand", label: "Brand" },
  { key: "campaign", label: "Campaign" },
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CollaborationFilters({
  currentSearch,
  currentType,
  currentStatus,
  currentBrand,
  currentCampaign,
  brands,
  campaigns,
}: {
  currentSearch: string;
  currentType: string;
  currentStatus: string;
  currentBrand: string;
  currentCampaign: string;
  brands: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchText, setSearchText] = useState(currentSearch);

  const [activeFilters, setActiveFilters] = useState<FilterKey[]>(() => {
    const initial: FilterKey[] = [];
    if (currentType) initial.push("type");
    if (currentStatus) initial.push("status");
    if (currentBrand) initial.push("brand");
    if (currentCampaign) initial.push("campaign");
    return initial;
  });

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`/collaborations?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const pushParamsDebounced = useCallback(
    (updates: Record<string, string>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => pushParams(updates), 300);
    },
    [pushParams]
  );

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  const addFilter = (key: FilterKey) => {
    setActiveFilters((prev) => [...prev, key]);
    setMenuOpen(false);
  };

  const removeFilter = (key: FilterKey) => {
    setActiveFilters((prev) => prev.filter((k) => k !== key));
    pushParams({ [key]: "" });
  };

  const remainingFilters = FILTER_OPTIONS.filter((f) => !activeFilters.includes(f.key));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by influencer name..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            pushParamsDebounced({ search: e.target.value });
          }}
          className="pl-8"
        />
      </div>

      {activeFilters.map((key) => (
        <div key={key} className="flex items-center gap-1">
          {key === "type" && (
            <select
              value={currentType}
              onChange={(e) => pushParams({ type: e.target.value })}
              className={selectClass}
            >
              <option value="">All Types</option>
              <option value="paid">Paid</option>
              <option value="barter">Barter</option>
            </select>
          )}

          {key === "status" && (
            <select
              value={currentStatus}
              onChange={(e) => pushParams({ status: e.target.value })}
              className={selectClass}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="outreach">Outreach</option>
              <option value="negotiation">Negotiation</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="content_submitted">Content Submitted</option>
              <option value="content_approved">Content Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}

          {key === "brand" && (
            <select
              value={currentBrand}
              onChange={(e) => pushParams({ brand: e.target.value })}
              className={selectClass}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {key === "campaign" && (
            <select
              value={currentCampaign}
              onChange={(e) => pushParams({ campaign: e.target.value })}
              className={selectClass}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => removeFilter(key)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      {remainingFilters.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-input px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="size-3.5" />
            Filter
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border bg-popover p-1 shadow-md">
              {remainingFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => addFilter(f.key)}
                  className="flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
