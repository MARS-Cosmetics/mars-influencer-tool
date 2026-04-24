"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Columns3, Download, ExternalLink, Search, StickyNote, Trash2, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@base-ui/react/tooltip";
import { BookmarkStatus } from "@/generated/prisma";
import {
  ALL_STATUSES,
  SORT_KEYS,
  STATUS_COLORS,
  STATUS_LABELS,
  type BookmarkRow,
  type SortKey,
} from "./types";

// ============================================================
// Constants
// ============================================================

const MAX_COMPARE = 4;

// ============================================================
// Helpers
// ============================================================

function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

// ============================================================
// Component
// ============================================================

interface Props {
  bookmarks: BookmarkRow[];
}

export function DiscoveredTable({ bookmarks }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // --- URL-driven filters/sort (keeps page state shareable + preserved on refresh) ---
  const rawSort = params.get("sort");
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(
    rawSort ?? "",
  )
    ? (rawSort as SortKey)
    : "createdAt";
  const rawStatusFilter = params.get("status") ?? "";
  const statusFilter = (
    ALL_STATUSES as readonly string[]
  ).includes(rawStatusFilter)
    ? rawStatusFilter
    : "";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.push(`/influencers/discovered?${next.toString()}`);
    });
  };

  // --- Search box — matches username OR fullname, case-insensitive. ---
  // Kept client-side (not in the URL) because it's a transient browsing filter,
  // not a bookmark-able app state. Preserves focus while typing.
  const [search, setSearch] = useState("");

  // --- Visible rows: apply client-side filter + sort ---
  const visible = useMemo(() => {
    let rows = bookmarks;

    // Search filter — matches handle or fullname (case-insensitive substring)
    const q = search.trim().toLowerCase().replace(/^@/, "");
    if (q) {
      rows = rows.filter((b) => {
        if (b.username.toLowerCase().includes(q)) return true;
        const fn = b.profileSnapshot.fullname?.toLowerCase() ?? "";
        return fn.includes(q);
      });
    }

    if (statusFilter) {
      rows = rows.filter((b) => b.status === statusFilter);
    }
    if (sort === "createdAt") {
      rows = [...rows].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    } else {
      rows = [...rows].sort((a, b) => {
        const key = sort === "followers" ? "followers" : "engagementRate";
        const va = a.profileSnapshot[key];
        const vb = b.profileSnapshot[key];
        const na = typeof va === "number" ? va : -1;
        const nb = typeof vb === "number" ? vb : -1;
        return nb - na;
      });
    }
    return rows;
  }, [bookmarks, statusFilter, sort, search]);

  // --- Selection state for comparison ---
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Track in-flight status updates (by bookmark id) to prevent click-races.
  const [pendingStatus, setPendingStatus] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_COMPARE) {
          toast.error(`You can compare up to ${MAX_COMPARE} creators at a time`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };
  const clearSelected = () => setSelected(new Set());

  // --- Note editor state ---
  const [noteEditing, setNoteEditing] = useState<BookmarkRow | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const openNoteEditor = (row: BookmarkRow) => {
    setNoteEditing(row);
    setNoteDraft(row.note ?? "");
  };

  // --- Actions ---
  const updateBookmark = async (
    id: string,
    patch: { status?: BookmarkStatus; note?: string | null },
  ) => {
    const res = await fetch(`/api/discovery/bookmark/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        body?.error ?? `Update failed (${res.status})`;
      // Surface server-provided detail in dev for easier debugging
      throw new Error(body?.detail ? `${msg}: ${body.detail}` : msg);
    }
    // Refresh server-rendered page so the source-of-truth data re-renders
    router.refresh();
  };

  const removeBookmark = async (id: string) => {
    if (!confirm("Remove this bookmark? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/discovery/bookmark/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Bookmark removed");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const saveNote = async () => {
    if (!noteEditing) return;
    const trimmed = noteDraft.trim();
    try {
      await updateBookmark(noteEditing.id, { note: trimmed || null });
      toast.success("Note saved");
      setNoteEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const changeStatus = async (id: string, status: BookmarkStatus) => {
    if (pendingStatus.has(id)) return; // ignore rapid double-clicks
    setPendingStatus((prev) => new Set(prev).add(id));
    try {
      await updateBookmark(id, { status });
      toast.success(`Status → ${STATUS_LABELS[status]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPendingStatus((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const exportCsv = () => {
    const qp = new URLSearchParams();
    if (statusFilter) qp.set("status", statusFilter);
    if (selected.size > 0) qp.set("ids", Array.from(selected).join(","));
    window.location.href = `/api/discovery/bookmark/export?${qp.toString()}`;
  };

  const goCompare = () => {
    if (selected.size < 2) {
      toast.error("Select at least 2 creators to compare");
      return;
    }
    router.push(
      `/influencers/discovered/compare?ids=${Array.from(selected).join(",")}`,
    );
  };

  // --- Empty / filtered states ---
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
        No bookmarks yet. Go to{" "}
        <Link href="/discover" className="text-primary hover:underline">
          Discover
        </Link>{" "}
        to search for creators and bookmark them here.
      </div>
    );
  }

  return (
    <Tooltip.Provider delay={300} closeDelay={0}>
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search by username or fullname */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by @handle or name"
              className="h-9 w-[240px] pl-8"
              aria-label="Search bookmarked creators"
            />
          </div>

          <label className="text-xs text-muted-foreground">Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setParam("status", e.target.value || null)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <label className="ml-2 text-xs text-muted-foreground">Sort</label>
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="createdAt">Date added (newest)</option>
            <option value="followers">Followers (high → low)</option>
            <option value="engagement">Engagement rate (high → low)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size < 2}
            onClick={goCompare}
          >
            <Columns3 className="mr-1 h-4 w-4" />
            Compare{selected.size >= 2 ? ` (${selected.size})` : ""}
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelected}>
              Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV{selected.size > 0 ? " (selected)" : ""}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>ER</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No bookmarks match the current filter.
                </TableCell>
              </TableRow>
            )}
            {visible.map((b) => {
              const p = b.profileSnapshot;
              const isSelected = selected.has(b.id);
              return (
                <TableRow key={b.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(b.id)}
                      aria-label={`Select ${b.username}`}
                    />
                  </TableCell>
                  <TableCell>
                    {/* Tooltip renders into a portal so the preview escapes the
                        table's overflow-x-auto clipping. Delay=120ms avoids
                        flashing previews on casual mouse traversal. */}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        render={
                          <div className="flex cursor-default items-center gap-3" />
                        }
                      >
                        <Avatar className="h-8 w-8">
                          {p.picture ? <AvatarImage src={p.picture} /> : null}
                          <AvatarFallback>
                            {b.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate font-medium">
                            <span className="truncate">
                              {p.fullname || b.username}
                            </span>
                            {p.isVerified && (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            )}
                          </div>
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              @{b.username}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              @{b.username}
                            </div>
                          )}
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner
                          side="bottom"
                          align="start"
                          sideOffset={6}
                          className="z-50 pointer-events-none"
                        >
                          <Tooltip.Popup className="pointer-events-none w-80 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
                            <HoverPreview bookmark={b} />
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {b.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCount(p.followers)}</TableCell>
                  <TableCell>
                    {typeof p.engagementRate === "number"
                      ? `${(p.engagementRate * 100).toFixed(2)}%`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <select
                      value={b.status}
                      disabled={pendingStatus.has(b.id)}
                      onChange={(e) =>
                        changeStatus(b.id, e.target.value as BookmarkStatus)
                      }
                      className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_COLORS[b.status]}`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto max-w-[180px] justify-start px-2 py-1 text-left"
                      onClick={() => openNoteEditor(b)}
                      title={b.note ?? "Add a note"}
                    >
                      <StickyNote className="mr-1 h-3 w-3 shrink-0" />
                      <span className="truncate text-xs">
                        {b.note
                          ? b.note.length > 28
                            ? b.note.slice(0, 28) + "…"
                            : b.note
                          : "Add note"}
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{b.campaign?.name ?? "—"}</div>
                      {b.campaign?.brand?.name && (
                        <div className="text-xs text-muted-foreground">
                          {b.campaign.brand.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/influencers/new?bookmarkId=${b.id}`}>
                        <Button size="sm" variant="outline">
                          <UserPlus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBookmark(b.id)}
                        aria-label="Remove bookmark"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Note edit dialog */}
      <Dialog
        open={!!noteEditing}
        onOpenChange={(o) => !o && setNoteEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Note for @{noteEditing?.username}
            </DialogTitle>
            <DialogDescription>
              Short reminders for your team — who reached out, context, etc.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={5}
            placeholder="e.g. DM'd Oct 3 — no reply. Re-ping next week."
            maxLength={2000}
          />
          <div className="text-right text-xs text-muted-foreground">
            {noteDraft.length} / 2000
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setNoteEditing(null)}
            >
              Cancel
            </Button>
            <Button onClick={saveNote}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Tooltip.Provider>
  );
}

// ============================================================
// Hover preview — shown when user hovers the creator-name cell
// ============================================================

function HoverPreview({ bookmark }: { bookmark: BookmarkRow }) {
  const p = bookmark.profileSnapshot;
  return (
    <div className="space-y-3 text-left">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          {p.picture ? <AvatarImage src={p.picture} /> : null}
          <AvatarFallback>
            {bookmark.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold">
              {p.fullname || bookmark.username}
            </span>
            {p.isVerified && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            @{bookmark.username} · {bookmark.platform}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Followers" value={formatCount(p.followers)} />
        <Metric
          label="ER"
          value={
            typeof p.engagementRate === "number"
              ? `${(p.engagementRate * 100).toFixed(2)}%`
              : "-"
          }
        />
        <Metric
          label="Engagements"
          value={formatCount(p.engagements)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${STATUS_COLORS[bookmark.status]}`}
        >
          {STATUS_LABELS[bookmark.status]}
        </span>
        {p.isPrivate && (
          <Badge variant="secondary" className="text-[10px]">
            Private
          </Badge>
        )}
        {p.isVerified && (
          <Badge variant="secondary" className="text-[10px]">
            Verified
          </Badge>
        )}
      </div>

      {bookmark.campaign && (
        <div className="text-xs">
          <div className="text-muted-foreground">Campaign</div>
          <div>{bookmark.campaign.name}</div>
          {bookmark.campaign.brand?.name && (
            <div className="text-muted-foreground">
              {bookmark.campaign.brand.name}
            </div>
          )}
        </div>
      )}

      {bookmark.note && (
        <div className="text-xs">
          <div className="text-muted-foreground">Note</div>
          <div className="whitespace-pre-line">
            {bookmark.note.length > 220
              ? bookmark.note.slice(0, 220) + "…"
              : bookmark.note}
          </div>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        Bookmarked {new Date(bookmark.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-1.5">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
