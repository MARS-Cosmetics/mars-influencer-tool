"use client";

import { useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

const FILTER_KEYS = ["search", "tier", "status", "state", "city"] as const;

export function ExportMenu() {
  const searchParams = useSearchParams();

  // Detect whether any list filters are active. If none, "current view" = "everything".
  const hasFilters = FILTER_KEYS.some((k) => {
    const v = searchParams.get(k);
    return v !== null && v.length > 0;
  });

  function buildHref(format: "xlsx" | "csv", scope: "filtered" | "all"): string {
    const params = new URLSearchParams();
    params.set("format", format);
    if (scope === "all") {
      params.set("scope", "all");
    } else {
      for (const k of FILTER_KEYS) {
        const v = searchParams.get(k);
        if (v) params.set(k, v);
      }
    }
    return `/api/influencers/export?${params.toString()}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <Download className="size-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {hasFilters && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Current view (with filters)</DropdownMenuLabel>
              <DropdownMenuItem
                render={
                  <a href={buildHref("xlsx", "filtered")} download>
                    <FileSpreadsheet className="size-4" />
                    Excel (.xlsx)
                  </a>
                }
              />
              <DropdownMenuItem
                render={
                  <a href={buildHref("csv", "filtered")} download>
                    <FileText className="size-4" />
                    CSV (.csv)
                  </a>
                }
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {hasFilters ? "All influencers (ignore filters)" : "Download all"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            render={
              <a href={buildHref("xlsx", "all")} download>
                <FileSpreadsheet className="size-4" />
                Excel (.xlsx)
              </a>
            }
          />
          <DropdownMenuItem
            render={
              <a href={buildHref("csv", "all")} download>
                <FileText className="size-4" />
                CSV (.csv)
              </a>
            }
          />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
