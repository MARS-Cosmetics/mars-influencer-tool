"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AgeGroup,
  ContactType,
  DiscoveryFilters,
  Gender,
} from "../lib/types";

const AGE_GROUPS: AgeGroup[] = ["18-24", "25-34", "35-44", "45-64", "65-"];
const GENDER_OPTIONS: Array<{ label: string; value: Gender | null }> = [
  { label: "Any", value: null },
  { label: "Female", value: "FEMALE" },
  { label: "Male", value: "MALE" },
];
const CONTACT_TYPES: ContactType[] = [
  "email",
  "phone",
  "instagram",
  "whatsapp",
  "linktree",
  "youtube",
  "tiktok",
  "twitter",
  "facebook",
  "snapchat",
  "telegram",
  "threads",
];
const LAST_POSTED_OPTIONS = [
  { label: "Any time", value: undefined as number | undefined },
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
];

interface Props {
  value: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  onReset: () => void;
}

/**
 * All filter controls for Discovery. Grouped into four sections:
 *   1. Creator size & quality  (followers, ER, verified, last posted)
 *   2. Creator demographics    (countries, gender)
 *   3. Audience                (age groups, language)
 *   4. Topics                  (hashtags)
 *   5. Required contact        (must-have contact types)
 *   6. Similar to              (lookalike creator handle)
 */
export function FilterPanel({ value, onChange, onReset }: Props) {
  const set = <K extends keyof DiscoveryFilters>(
    key: K,
    v: DiscoveryFilters[K],
  ) => onChange({ ...value, [key]: v });

  // --- chip helpers ---
  const addToList = <K extends "countries" | "hashtags">(
    key: K,
    raw: string,
  ) => {
    const item = raw.trim().replace(/^#/, "");
    if (!item) return;
    const existing = (value[key] as string[] | undefined) ?? [];
    if (existing.includes(item)) return;
    set(key, [...existing, item] as DiscoveryFilters[K]);
  };

  const removeFromList = <K extends "countries" | "hashtags">(
    key: K,
    item: string,
  ) => {
    const list = value[key] ?? [];
    set(
      key,
      (list as string[]).filter((x) => x !== item) as DiscoveryFilters[K],
    );
  };

  const toggleAge = (g: AgeGroup) => {
    const cur = value.audienceAgeGroups ?? [];
    const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
    set("audienceAgeGroups", next.length ? next : undefined);
  };

  const toggleContact = (t: ContactType) => {
    const cur = value.contactRequired ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    set("contactRequired", next.length ? next : undefined);
  };

  const hasUsernameSearch = !!value.usernameSearch?.trim();

  return (
    <div className="space-y-4">
      {/* ─── 0. Username search (direct creator lookup) ─── */}
      <section
        className={`rounded-lg border p-4 space-y-2 ${
          hasUsernameSearch ? "bg-primary/5 ring-1 ring-primary/30" : "bg-card"
        }`}
      >
        <h3 className="text-sm font-semibold">Find by username</h3>
        <p className="text-xs text-muted-foreground">
          Search for a specific creator handle. Leave empty to use the other
          filters below.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="@the.rebel.kid or prefix"
            value={value.usernameSearch ?? ""}
            onChange={(e) =>
              set("usernameSearch", e.target.value || undefined)
            }
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={value.usernameMatch ?? "prefix"}
            onChange={(e) =>
              set(
                "usernameMatch",
                e.target.value as "prefix" | "exact",
              )
            }
          >
            <option value="prefix">prefix</option>
            <option value="exact">exact</option>
          </select>
        </div>
        {hasUsernameSearch && (
          <p className="text-xs text-primary">
            Username search active — other filters below are ignored.
          </p>
        )}
      </section>

      {/* Every section below this is disabled/dimmed while username search is on */}
      <div
        className={
          hasUsernameSearch
            ? "pointer-events-none space-y-4 opacity-50"
            : "space-y-4"
        }
        aria-disabled={hasUsernameSearch}
      >

      {/* ─── 1. Creator size & quality ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Creator size &amp; quality</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min followers</Label>
            <Input
              type="number"
              placeholder="e.g. 50000"
              value={value.followersMin ?? ""}
              onChange={(e) =>
                set(
                  "followersMin",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max followers</Label>
            <Input
              type="number"
              placeholder="e.g. 1000000"
              value={value.followersMax ?? ""}
              onChange={(e) =>
                set(
                  "followersMax",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min engagement rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 3"
              value={value.engagementRateMin ?? ""}
              onChange={(e) =>
                set(
                  "engagementRateMin",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Posted within</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={value.lastPostedDays ?? ""}
              onChange={(e) =>
                set(
                  "lastPostedDays",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            >
              {LAST_POSTED_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.verifiedOnly ?? false}
            onChange={(e) =>
              set("verifiedOnly", e.target.checked || undefined)
            }
          />
          Verified accounts only
        </label>
      </section>

      {/* ─── 2. Creator demographics ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Creator demographics</h3>

        <div className="space-y-1">
          <Label className="text-xs">Countries</Label>
          <div className="flex flex-wrap gap-1">
            {value.countries.map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeFromList("countries", c)}
              >
                {c}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Type a country and press Enter (e.g. India)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addToList("countries", (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                type="button"
                size="sm"
                variant={
                  (opt.value ?? null) === (value.gender ?? null)
                    ? "default"
                    : "outline"
                }
                onClick={() => set("gender", opt.value ?? undefined)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Audience ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Audience</h3>

        <div className="space-y-1">
          <Label className="text-xs">Audience age groups (multi-select)</Label>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map((g) => {
              const selected = value.audienceAgeGroups?.includes(g) ?? false;
              return (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleAge(g)}
                >
                  {g}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Audience language</Label>
          <Input
            placeholder="e.g. Hindi, English, Tamil"
            value={value.audienceLanguage ?? ""}
            onChange={(e) =>
              set("audienceLanguage", e.target.value || undefined)
            }
          />
        </div>
      </section>

      {/* ─── 4. Topics (hashtags) ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Topics (hashtags)</h3>
        <p className="text-xs text-muted-foreground">
          Find creators who have posted with any of these hashtags.
        </p>
        <div className="flex flex-wrap gap-1">
          {(value.hashtags ?? []).map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeFromList("hashtags", t)}
            >
              #{t}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Type a hashtag (without #) and press Enter"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addToList("hashtags", (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </section>

      {/* ─── 5. Required contact ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Required contact</h3>
        <p className="text-xs text-muted-foreground">
          Creator must have the selected contact type(s).
        </p>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TYPES.map((t) => {
            const selected = value.contactRequired?.includes(t) ?? false;
            return (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => toggleContact(t)}
              >
                {t}
              </Button>
            );
          })}
        </div>
      </section>

      {/* ─── 6. Similar to (lookalike) ─── */}
      <section className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Similar to a creator</h3>
        <p className="text-xs text-muted-foreground">
          Paste a creator&apos;s handle to find others in their niche. Combines
          with all filters above.
        </p>
        <Input
          placeholder="@the.rebel.kid"
          value={value.similarToHandle ?? ""}
          onChange={(e) =>
            set("similarToHandle", e.target.value || undefined)
          }
        />
      </section>

      </div>
      {/* /dimmed-when-username-search */}

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
