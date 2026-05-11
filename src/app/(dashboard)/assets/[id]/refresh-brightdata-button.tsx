"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  assetId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function RefreshBrightDataButton({ assetId, disabled, disabledReason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);

  async function handleRefresh() {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/refresh-brightdata`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Failed to fetch post metrics from Bright Data");
        return;
      }
      const updated: string[] = body?.updatedFields ?? [];
      if (updated.length === 0) {
        toast.warning("Bright Data returned no numeric metrics for this URL");
      } else {
        toast.success(`Updated: ${updated.join(", ")}`);
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to fetch post metrics from Bright Data");
    } finally {
      setIsFetching(false);
    }
  }

  const busy = isFetching || isPending;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={busy || disabled}
      title={
        disabled
          ? disabledReason ||
            "Bright Data refresh requires Instagram platform + a contentUrl"
          : "Fetch latest views / likes / comments from Bright Data (may take up to 90s)"
      }
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {busy ? "Fetching..." : "Fetch post metrics"}
    </Button>
  );
}
