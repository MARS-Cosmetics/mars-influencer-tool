"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

export function InfluencerFilters({
  currentSearch,
  currentTier,
  currentStatus,
}: {
  currentSearch: string;
  currentTier: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/influencers?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or handle..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const target = e.target as HTMLInputElement;
            updateParams("search", target.value);
          }}
          className="pl-8"
        />
      </div>
      <select
        defaultValue={currentTier}
        onChange={(e) => updateParams("tier", e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {tiers.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        defaultValue={currentStatus}
        onChange={(e) => updateParams("status", e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
