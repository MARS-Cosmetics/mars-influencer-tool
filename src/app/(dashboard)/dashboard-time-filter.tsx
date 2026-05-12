"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

/**
 * Drives the dashboard metrics window via URL params (?from=YYYY-MM-DD&to=...).
 * Server page reads the same params and recomputes its time-scoped numbers.
 *
 * Why URL-driven: shareable links + browser back button work; no client-side
 * state to keep in sync with server queries.
 */

const PRESETS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export function DashboardTimeFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const urlFrom = params.get("from") ?? daysAgo(30);
  const urlTo = params.get("to") ?? isoDate(new Date());

  // Custom panel uses uncontrolled-style state — initialized from URL when
  // the user opens it. No effect-based sync (anti-pattern in React 19).
  // The panel is keyed on showCustom + urlFrom + urlTo so re-opening it
  // after a preset click rebinds the inputs to the new URL window.
  const [showCustom, setShowCustom] = useState(false);

  function applyPreset(days: number) {
    const next = new URLSearchParams(params.toString());
    next.set("from", daysAgo(days));
    next.set("to", isoDate(new Date()));
    router.push(`/?${next.toString()}`);
    setShowCustom(false);
  }

  function applyCustom(form: HTMLFormElement) {
    const fd = new FormData(form);
    const nextFrom = String(fd.get("from") || "");
    const nextTo = String(fd.get("to") || "");
    if (!nextFrom || !nextTo) return;
    const next = new URLSearchParams(params.toString());
    next.set("from", nextFrom);
    next.set("to", nextTo);
    router.push(`/?${next.toString()}`);
  }

  // Highlight the active preset by comparing URL window length to preset days.
  const windowDays = Math.round(
    (new Date(urlTo).getTime() - new Date(urlFrom).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const matchedPreset = PRESETS.find(
    (p) => Math.abs(p.days - windowDays) <= 1 && urlTo === isoDate(new Date()),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Metrics window
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              matchedPreset?.days === p.days
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            !matchedPreset
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Calendar className="h-3 w-3" />
          Custom
        </button>
      </div>
      <span className="text-xs text-zinc-500">
        {urlFrom} → {urlTo}
      </span>
      {showCustom && (
        // Key on the URL window forces the form to reinitialize when the
        // user picks a preset and then re-opens custom — the inputs reset
        // to the now-current URL values via defaultValue.
        <form
          key={`${urlFrom}-${urlTo}`}
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom(e.currentTarget);
          }}
          className="flex items-center gap-2"
        >
          <Input
            type="date"
            name="from"
            defaultValue={urlFrom}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-zinc-400">to</span>
          <Input
            type="date"
            name="to"
            defaultValue={urlTo}
            className="h-8 w-[140px] text-xs"
          />
          <Button size="sm" type="submit">
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
