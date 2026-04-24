"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Tab nav shared by /influencers and /influencers/discovered pages.
 * Keeps the two views visually connected so users understand they're
 * looking at the same "people" universe — onboarded vs. prospects.
 */
export function InfluencerTabs({
  discoveredCount,
}: {
  discoveredCount: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/influencers", label: "All Influencers" },
    {
      href: "/influencers/discovered",
      label: `Discovered${discoveredCount > 0 ? ` (${discoveredCount})` : ""}`,
    },
  ];

  return (
    <div className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
