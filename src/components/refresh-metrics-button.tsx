"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Clock,
} from "lucide-react";

const CHUNK_SIZE = 25;
const PARALLEL_CHUNKS = 2;

type Status = {
  role: string;
  lastRefreshAt: string | null;
  nextAllowedAt: string | null;
  canRefresh: boolean;
  cooldownLabel: string;
  triggeredBy: { userId: string; role: string } | null;
};

type Candidates = {
  cooldownActive: false;
  role: string;
  ids: string[];
  totalCandidates: number;
  returned: number;
  cap: number;
  lastRefreshAt: string | null;
  maxAssetAgeDays: number | null;
};

type CooldownResponse = {
  cooldownActive: true;
  role: string;
  lastRefreshAt: string | null;
  nextAllowedAt: string | null;
  cooldownLabel: string;
  triggeredBy: { userId: string; role: string } | null;
};

type BatchResult = {
  updated: { id: string }[];
  failed: { id: string; reason: string }[];
  skipped: { id: string; reason: string }[];
  cycleReverted?: boolean;
};

type RunResults = {
  updated: number;
  failed: number;
  skipped: number;
  failedIds: string[];
};

type Phase = "idle" | "loading-candidates" | "confirm" | "running" | "done" | "error";

export function RefreshMetricsButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [cooldown, setCooldown] = useState<CooldownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RunResults | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/assets/refresh-status");
      if (!res.ok) return;
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch {
      // Status check failures are non-fatal — button stays available, the
      // actual click will surface any real auth/server issues.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll while button is mounted so cooldown counter feels live.
    // 60s cadence is plenty — no need to hammer the API.
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  useEffect(() => {
    if (phase === "idle") cancelRef.current = false;
  }, [phase]);

  async function openModal() {
    setPhase("loading-candidates");
    setError(null);
    setResults(null);
    setCooldown(null);
    setCandidates(null);
    try {
      const res = await fetch("/api/assets/refresh-candidates");
      if (res.status === 423) {
        const data = (await res.json()) as CooldownResponse;
        setCooldown(data);
        setPhase("confirm");
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load candidates: ${res.status} ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as Candidates;
      setCandidates(data);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function close() {
    if (phase === "running") {
      cancelRef.current = true;
      return;
    }
    setPhase("idle");
    setCandidates(null);
    setCooldown(null);
    setError(null);
    setResults(null);
    setProgress({ done: 0, total: 0 });
  }

  async function runRefresh() {
    if (!candidates || candidates.ids.length === 0) return;
    setPhase("running");
    setProgress({ done: 0, total: candidates.ids.length });

    const chunks: string[][] = [];
    for (let i = 0; i < candidates.ids.length; i += CHUNK_SIZE) {
      chunks.push(candidates.ids.slice(i, i + CHUNK_SIZE));
    }

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    let cursor = 0;
    let externallyCooledDown = false;
    let cooldownWasReset = false;
    const failedIds: string[] = [];

    async function worker() {
      while (cursor < chunks.length && !cancelRef.current) {
        const myIndex = cursor++;
        const chunk = chunks[myIndex];
        try {
          const res = await fetch("/api/assets/refresh-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetIds: chunk }),
          });
          if (res.status === 423) {
            // Cooldown engaged mid-run (e.g. user cycle expired). Stop.
            externallyCooledDown = true;
            cancelRef.current = true;
            failed += chunk.length;
            failedIds.push(...chunk);
            break;
          }
          if (!res.ok) {
            failed += chunk.length;
            failedIds.push(...chunk);
          } else {
            const data = (await res.json()) as BatchResult;
            updated += data.updated.length;
            failed += data.failed.length;
            skipped += data.skipped.length;
            for (const f of data.failed) failedIds.push(f.id);
            if (data.cycleReverted) cooldownWasReset = true;
          }
        } catch {
          failed += chunk.length;
          failedIds.push(...chunk);
        } finally {
          setProgress((p) => ({ ...p, done: p.done + chunk.length }));
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_CHUNKS, chunks.length) }, () => worker()),
    );

    setResults({ updated, failed, skipped, failedIds });
    setPhase("done");
    router.refresh();
    fetchStatus();
    if (externallyCooledDown) {
      setError("Cooldown engaged mid-run — remaining assets were not refreshed.");
    } else if (cooldownWasReset && updated === 0) {
      setError(
        "Refresh failed — Bright Data didn't return any data. The cooldown has been reset so you can try again immediately.",
      );
    }
  }

  // Retry only the failed ones, using the SINGLE-asset endpoint so we bypass
  // the global cooldown lock. Each asset = one Bright Data call. Limited
  // concurrency so we don't hammer their API.
  async function retryFailed() {
    if (!results || results.failedIds.length === 0) return;
    const ids = [...results.failedIds];
    setRetrying(true);
    setRetryProgress({ done: 0, total: ids.length });

    let retried = 0;
    let stillFailed = 0;
    const stillFailedIds: string[] = [];
    let cursor = 0;
    const CONCURRENCY = 3;

    async function worker() {
      while (cursor < ids.length) {
        const i = cursor++;
        const id = ids[i];
        try {
          const res = await fetch(`/api/assets/${id}/refresh-brightdata`, {
            method: "POST",
          });
          if (res.ok) {
            retried++;
          } else {
            stillFailed++;
            stillFailedIds.push(id);
          }
        } catch {
          stillFailed++;
          stillFailedIds.push(id);
        } finally {
          setRetryProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()),
    );

    setRetrying(false);
    setResults({
      updated: (results.updated ?? 0) + retried,
      failed: stillFailed,
      skipped: results.skipped,
      failedIds: stillFailedIds,
    });
    setError(null);
    router.refresh();
    fetchStatus();
  }

  // ------ Render ------
  const lastLabel = status?.lastRefreshAt
    ? relativeFromNow(status.lastRefreshAt)
    : null;
  const nextLabel = status?.nextAllowedAt
    ? relativeFromNow(status.nextAllowedAt)
    : null;
  const inCooldown = status && !status.canRefresh;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={inCooldown ? "outline" : "outline"}
        onClick={openModal}
        disabled={phase !== "idle" || !!inCooldown}
        className="gap-1.5"
      >
        {phase === "loading-candidates" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : inCooldown ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Refresh metrics
      </Button>
      {status && (
        <div className="text-[10px] text-zinc-500">
          {status.lastRefreshAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Last refresh {lastLabel}
              {inCooldown && nextLabel ? (
                <span className="ml-1 text-zinc-400">
                  · next {nextLabel} ({status.cooldownLabel} for {status.role})
                </span>
              ) : null}
            </span>
          ) : (
            <span>Metrics have never been refreshed via this button.</span>
          )}
        </div>
      )}

      {phase !== "idle" && phase !== "loading-candidates" && (
        <Modal onClose={close} canClose={phase !== "running"}>
          {phase === "error" && error && !results && (
            <ErrorState message={error} onClose={close} />
          )}
          {phase === "confirm" && cooldown && (
            <CooldownState cooldown={cooldown} onClose={close} />
          )}
          {phase === "confirm" && candidates && (
            <ConfirmState
              candidates={candidates}
              role={status?.role ?? "user"}
              onCancel={close}
              onConfirm={runRefresh}
            />
          )}
          {phase === "running" && (
            <RunningState
              done={progress.done}
              total={progress.total}
              onStop={close}
            />
          )}
          {phase === "done" && results && (
            <DoneState
              results={results}
              hint={error}
              retrying={retrying}
              retryProgress={retryProgress}
              onRetryFailed={retryFailed}
              onClose={close}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  canClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
  canClose: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={canClose ? onClose : undefined}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            Refresh metrics from Bright Data
          </h2>
          {canClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function CooldownState({
  cooldown,
  onClose,
}: {
  cooldown: CooldownResponse;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start gap-2 text-sm text-zinc-800">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <div>
          <p className="font-medium">Already refreshed recently.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Last refresh:{" "}
            <strong className="text-zinc-700">
              {cooldown.lastRefreshAt
                ? new Date(cooldown.lastRefreshAt).toLocaleString()
                : "—"}
            </strong>
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Your next refresh ({cooldown.cooldownLabel} cooldown for{" "}
            <code className="rounded bg-zinc-100 px-1">{cooldown.role}</code>) is
            available{" "}
            <strong className="text-zinc-700">
              {cooldown.nextAllowedAt
                ? new Date(cooldown.nextAllowedAt).toLocaleString()
                : "—"}
            </strong>
            .
          </p>
          {cooldown.triggeredBy && cooldown.triggeredBy.role && (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Triggered by a {cooldown.triggeredBy.role}.
            </p>
          )}
        </div>
      </div>
      <p className="text-[11px] text-zinc-400">
        Existing metrics in the dashboard are from that last refresh — they're not
        being held back, they're just the most recent numbers Bright Data has
        returned.
      </p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}

function ConfirmState({
  candidates,
  role,
  onCancel,
  onConfirm,
}: {
  candidates: Candidates;
  role: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const total = candidates.ids.length;
  const cappedNotice = candidates.returned === candidates.cap && candidates.totalCandidates > candidates.cap;
  const batches = Math.ceil(total / CHUNK_SIZE);
  const etaLow = Math.ceil(batches / PARALLEL_CHUNKS) * 30;
  const etaHigh = Math.ceil(batches / PARALLEL_CHUNKS) * 180;

  if (total === 0) {
    return (
      <div className="mt-3">
        <p className="text-sm text-zinc-700">
          No Instagram assets are eligible for refresh
          {candidates.maxAssetAgeDays !== null
            ? ` (within the last ${candidates.maxAssetAgeDays} days)`
            : ""}
          .
        </p>
        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={onCancel}>
            OK
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-zinc-700">
        This will fetch fresh metrics for <strong>all {total}</strong> Instagram
        assets
        {candidates.maxAssetAgeDays !== null
          ? ` published in the last ${candidates.maxAssetAgeDays} days`
          : " in your account"}
        .
      </p>
      {cappedNotice && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>Capped at {candidates.cap}.</strong>{" "}
          {candidates.totalCandidates - candidates.cap} additional assets exist —
          increase the cap in code if you need them all in one click.
        </div>
      )}
      <div className="space-y-1 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        <div>
          <strong>Bright Data calls:</strong> {total} records billed
        </div>
        <div>
          <strong>Estimated time:</strong> ~{formatSec(etaLow)} to{" "}
          {formatSec(etaHigh)}
        </div>
        <div>
          <strong>Cooldown after this click:</strong> the next refresh button
          press is locked for{" "}
          <code className="rounded bg-zinc-200 px-1">{role}</code> until the
          role-specific cooldown expires (30 min admin · 6 h user).
        </div>
      </div>
      <p className="text-[11px] text-zinc-400">
        Keep this tab open. Failed scrapes leave existing metrics untouched.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm}>
          Refresh all {total} assets
        </Button>
      </div>
    </div>
  );
}

function RunningState({
  done,
  total,
  onStop,
}: {
  done: number;
  total: number;
  onStop: () => void;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-zinc-700">
        Refreshing {done} / {total} assets…
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full bg-[#A6192E] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-zinc-400">
        Don't close this tab. Stopping leaves the rest unrefreshed (old data
        stays intact).
      </p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={onStop}>
          Stop
        </Button>
      </div>
    </div>
  );
}

function DoneState({
  results,
  hint,
  retrying,
  retryProgress,
  onRetryFailed,
  onClose,
}: {
  results: RunResults;
  hint: string | null;
  retrying: boolean;
  retryProgress: { done: number; total: number };
  onRetryFailed: () => void;
  onClose: () => void;
}) {
  const canRetry = results.failedIds.length > 0 && !retrying;
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 text-sm text-zinc-800">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        Refresh complete.
      </div>
      <div className="space-y-0.5 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <div>
          <span className="font-semibold text-emerald-700">
            {results.updated}
          </span>{" "}
          assets updated with new metrics
        </div>
        {results.failed > 0 && (
          <div>
            <span className="font-semibold text-red-700">{results.failed}</span>{" "}
            failed (old data preserved)
          </div>
        )}
        {results.skipped > 0 && (
          <div>
            <span className="font-semibold text-amber-700">
              {results.skipped}
            </span>{" "}
            skipped (cooldown / not eligible)
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-amber-700">{hint}</p>}

      {retrying && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-600">
            Retrying {retryProgress.done} / {retryProgress.total} one-by-one…
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-[#A6192E] transition-all"
              style={{
                width: `${retryProgress.total > 0 ? Math.round((retryProgress.done / retryProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {canRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetryFailed}
            className="gap-1.5"
          >
            <Loader2
              className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : "hidden"}`}
            />
            Retry {results.failedIds.length} failed
          </Button>
        )}
        <Button size="sm" onClick={onClose} disabled={retrying}>
          Done
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start gap-2 text-sm text-zinc-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <span>{message}</span>
      </div>
      <p className="text-[11px] text-zinc-400">Existing data is unchanged.</p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function formatSec(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m}m ${r}s`;
}

function relativeFromNow(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = t - now;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const past = diffMs < 0;
  if (min < 1) return past ? "just now" : "in <1 min";
  if (min < 60) return past ? `${min} min ago` : `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return past ? `${hr}h ago` : `in ${hr}h`;
  const days = Math.round(hr / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}
