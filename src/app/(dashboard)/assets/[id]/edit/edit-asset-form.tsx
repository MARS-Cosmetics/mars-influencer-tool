"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const platforms = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
];

const contentTypes = [
  { value: "reel", label: "Reel" },
  { value: "static_post", label: "Static Post" },
  { value: "carousel", label: "Carousel" },
  { value: "video", label: "Video" },
  { value: "short", label: "Short" },
  { value: "tweet", label: "Tweet" },
  { value: "article", label: "Article" },
  { value: "other", label: "Other" },
];

const assetStatuses = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export interface EditAssetFormInitial {
  id: string;
  platform: string;
  contentType: string;
  status: string;
  contentUrl: string;
  fileUrl: string;
  thumbnailUrl: string;
  dueDate: string;
  publishedAt: string;
  hasAdRights: boolean;
  views: number | string;
  likes: number | string;
  comments: number | string;
  shares: number | string;
  saves: number | string;
  reach: number | string;
  impressions: number | string;
  contentRating: number | string;
  ratingTags: string;
  ratingNotes: string;
}

interface Props {
  initial: EditAssetFormInitial;
}

export function EditAssetForm({ initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initial);

  function setField<K extends keyof EditAssetFormInitial>(
    name: K,
    value: EditAssetFormInitial[K],
  ) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setField(
        name as keyof EditAssetFormInitial,
        (e.target as HTMLInputElement).checked as EditAssetFormInitial[keyof EditAssetFormInitial],
      );
      return;
    }
    setField(
      name as keyof EditAssetFormInitial,
      value as EditAssetFormInitial[keyof EditAssetFormInitial],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Send the same shape the PUT endpoint already handles — date strings,
      // numbers, "" → null. The route normalizes everything.
      const payload: Record<string, unknown> = {
        platform: form.platform,
        contentType: form.contentType,
        status: form.status,
        contentUrl: form.contentUrl,
        fileUrl: form.fileUrl,
        thumbnailUrl: form.thumbnailUrl,
        dueDate: form.dueDate,
        publishedAt: form.publishedAt,
        hasAdRights: form.hasAdRights,
        views: form.views,
        likes: form.likes,
        comments: form.comments,
        shares: form.shares,
        saves: form.saves,
        reach: form.reach,
        impressions: form.impressions,
        contentRating: form.contentRating,
        ratingTags: form.ratingTags,
        ratingNotes: form.ratingNotes,
      };

      const res = await fetch(`/api/assets/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update asset");
      }

      toast.success("Asset updated");
      router.push(`/assets/${initial.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update asset");
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Content / Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content & Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="contentUrl">Content URL (Instagram post / reel link)</Label>
            <Input
              id="contentUrl"
              name="contentUrl"
              value={form.contentUrl}
              onChange={handleChange}
              placeholder="https://instagram.com/reel/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileUrl">File URL</Label>
            <Input
              id="fileUrl"
              name="fileUrl"
              value={form.fileUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
            <Input
              id="thumbnailUrl"
              name="thumbnailUrl"
              value={form.thumbnailUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Classification & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <select
              id="platform"
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className={selectClass}
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <select
              id="contentType"
              name="contentType"
              value={form.contentType}
              onChange={handleChange}
              className={selectClass}
            >
              {contentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className={selectClass}
            >
              {assetStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Dates & Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dates & Rights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Published On</Label>
            <Input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              value={form.publishedAt}
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="hasAdRights"
              name="hasAdRights"
              type="checkbox"
              checked={form.hasAdRights}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <Label htmlFor="hasAdRights" className="cursor-pointer">
              Ad Rights granted
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Metrics</CardTitle>
          <p className="text-xs text-muted-foreground">
            Bright Data refresh overwrites views / likes / comments / shares
            when available. Saves / reach / impressions are owner-only —
            type them in manually if you have them.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {(
            [
              ["views", "Views"],
              ["likes", "Likes"],
              ["comments", "Comments"],
              ["shares", "Shares"],
              ["saves", "Saves"],
              ["reach", "Reach"],
              ["impressions", "Impressions"],
            ] as const
          ).map(([name, label]) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                name={name}
                type="number"
                min={0}
                value={form[name]}
                onChange={handleChange}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contentRating">Rating (1–5)</Label>
            <Input
              id="contentRating"
              name="contentRating"
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={form.contentRating}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ratingTags">Rating Tags (comma-separated)</Label>
            <Input
              id="ratingTags"
              name="ratingTags"
              value={form.ratingTags}
              onChange={handleChange}
              placeholder="creative, on-brand, high-energy"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ratingNotes">Rating Notes</Label>
            <textarea
              id="ratingNotes"
              name="ratingNotes"
              value={form.ratingNotes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Link href={`/assets/${initial.id}`}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
