"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  id: string;
  platform: string;
  handle: string | null;
}

export function SuggestionRowActions({ id, platform, handle }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy("approve");
    setError(null);

    const body: Record<string, string> = {};
    if (handle) {
      if (platform === "instagram") body.instagramHandle = handle;
      else if (platform === "youtube") body.youtubeHandle = handle;
      else if (platform === "tiktok") body.tiktokHandle = handle;
      body.name = `@${handle}`;
    }

    try {
      const res = await fetch(`/api/suggestions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error ?? "Failed to approve");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    const note = window.prompt("Optional reason for rejection:");
    // null = user cancelled, empty string = no reason but confirmed
    if (note === null) return;

    setBusy("reject");
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note ? { note } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error ?? "Failed to reject");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button
        size="sm"
        variant="outline"
        onClick={reject}
        disabled={busy !== null}
      >
        {busy === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        <span className="ml-1">Reject</span>
      </Button>
      <Button
        size="sm"
        onClick={approve}
        disabled={busy !== null}
      >
        {busy === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        <span className="ml-1">Approve</span>
      </Button>
    </div>
  );
}
