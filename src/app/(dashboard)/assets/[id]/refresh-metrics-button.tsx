"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  assetId: string;
  lastSyncedAt: string | null;
}

export function RefreshMetricsButton({ assetId, lastSyncedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);

  async function handleRefresh() {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/refresh-metrics`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Failed to refresh from CreatorX");
        return;
      }
      toast.success("Influencer profile refreshed from CreatorX");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to refresh from CreatorX");
    } finally {
      setIsFetching(false);
    }
  }

  const busy = isFetching || isPending;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        Refresh from CreatorX
      </Button>
      {lastSyncedAt && (
        <span className="text-[11px] text-zinc-500">
          Last synced {new Date(lastSyncedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </span>
      )}
    </div>
  );
}
