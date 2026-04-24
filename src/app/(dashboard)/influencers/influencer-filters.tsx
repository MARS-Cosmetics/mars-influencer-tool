"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, X } from "lucide-react";
import { INDIAN_STATES } from "@/lib/constants";
import { getCitiesForState } from "@/lib/indian-cities";

type FilterKey = "tier" | "status" | "state" | "city";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "tier", label: "Tier" },
  { key: "status", label: "Status" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
];

const tiers = [
  { value: "", label: "All Tiers" },
  { value: "nano", label: "Nano" },
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid" },
  { value: "macro", label: "Macro" },
  { value: "mega", label: "Mega" },
];

const statuses = [
  { value: "", label: "All Statuses" },
  { value: "discovered", label: "Discovered" },
  { value: "contacted", label: "Contacted" },
  { value: "form_submitted", label: "Form Submitted" },
  { value: "demographics_verified", label: "Demographics Verified" },
  { value: "onboarded", label: "Onboarded" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "do_not_contact", label: "Do Not Contact" },
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function InfluencerFilters({
  currentSearch,
  currentTier,
  currentStatus,
  currentState,
  currentCity,
}: {
  currentSearch: string;
  currentTier: string;
  currentStatus: string;
  currentState: string;
  currentCity: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local state for text inputs (debounced)
  const [searchText, setSearchText] = useState(currentSearch);
  const [stateText, setStateText] = useState(currentState);
  const [cityText, setCityText] = useState(currentCity);

  // Auto-show filters that have values from URL
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>(() => {
    const initial: FilterKey[] = [];
    if (currentTier) initial.push("tier");
    if (currentStatus) initial.push("status");
    if (currentState) initial.push("state");
    if (currentCity) initial.push("city");
    return initial;
  });

  // Push URL params immediately
  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`/influencers?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  // Push URL params with debounce (for text inputs)
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

  // Close menu on outside click
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
    // Clear local text state too
    if (key === "state") setStateText("");
    if (key === "city") setCityText("");
    pushParams({ [key]: "" });
  };

  const remainingFilters = FILTER_OPTIONS.filter((f) => !activeFilters.includes(f.key));
  const cities = stateText ? getCitiesForState(stateText) : [];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or handle..."
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
          {key === "tier" && (
            <select
              value={currentTier}
              onChange={(e) => pushParams({ tier: e.target.value })}
              className={selectClass}
            >
              {tiers.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}

          {key === "status" && (
            <select
              value={currentStatus}
              onChange={(e) => pushParams({ status: e.target.value })}
              className={selectClass}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}

          {key === "state" && (
            <>
              <input
                list="influencer-state-options"
                value={stateText}
                onChange={(e) => {
                  setStateText(e.target.value);
                  pushParamsDebounced({ state: e.target.value });
                }}
                placeholder="Type or select state..."
                className={selectClass + " w-[180px]"}
              />
              <datalist id="influencer-state-options">
                {INDIAN_STATES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </>
          )}

          {key === "city" && (
            <>
              <input
                list="influencer-city-options"
                value={cityText}
                onChange={(e) => {
                  setCityText(e.target.value);
                  pushParamsDebounced({ city: e.target.value });
                }}
                placeholder="Type city name..."
                className={selectClass + " w-[180px]"}
              />
              <datalist id="influencer-city-options">
                {cities.map((c) => <option key={c} value={c} />)}
              </datalist>
            </>
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
