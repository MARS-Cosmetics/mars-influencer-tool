"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";

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

function formatCount(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

interface Collaboration {
  id: string;
  type: string;
  influencerId: string;
  brand?: { name: string };
}

export default function NewAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [collaborationOptions, setCollaborationOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    collaborationId: "",
    influencerId: "",
    platform: "",
    contentType: "",
    contentUrl: "",
    fileUrl: "",
    thumbnailUrl: "",
    status: "pending",
  });

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    fetch("/api/influencers?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const influencers = data.influencers || [];
        setInfluencerOptions(
          influencers.map((inf: { id: string; name: string; instagramHandle?: string; tier?: string; igFollowerCount?: number; city?: string }) => ({
            value: inf.id,
            label: inf.name,
            sublabel: [
              inf.instagramHandle ? `@${inf.instagramHandle}` : null,
              inf.tier,
              inf.igFollowerCount ? `${formatCount(inf.igFollowerCount)} followers` : null,
              inf.city,
            ].filter(Boolean).join(" · "),
          }))
        );
      });
  }, []);

  useEffect(() => {
    if (form.influencerId) {
      fetch(`/api/influencers/${form.influencerId}`)
        .then((r) => r.json())
        .then((data) => {
          const collabs: Collaboration[] = data.collaborations || [];
          setCollaborationOptions(
            collabs.map((c) => ({
              value: c.id,
              label: c.type + (c.brand ? ` - ${c.brand.name}` : ""),
            }))
          );
        });
    } else {
      setCollaborationOptions([]);
    }
  }, [form.influencerId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create asset");
      }

      toast.success("Asset created successfully");
      router.push("/assets");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create asset"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Asset</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="influencerId">Influencer *</Label>
                <SearchableSelect
                  options={influencerOptions}
                  value={form.influencerId}
                  onChange={(value) => {
                    setField("influencerId", value);
                    setField("collaborationId", "");
                  }}
                  placeholder="Select influencer"
                  searchPlaceholder="Search influencers..."
                  emptyMessage="No influencers found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaborationId">Collaboration *</Label>
                <SearchableSelect
                  options={collaborationOptions}
                  value={form.collaborationId}
                  onChange={(value) => setField("collaborationId", value)}
                  placeholder="Select collaboration"
                  searchPlaceholder="Search collaborations..."
                  emptyMessage="No collaborations found."
                  disabled={!form.influencerId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <select
                  id="platform"
                  name="platform"
                  value={form.platform}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select platform</option>
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type *</Label>
                <select
                  id="contentType"
                  name="contentType"
                  value={form.contentType}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select content type</option>
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

              <div className="space-y-2">
                <Label htmlFor="contentUrl">Content URL</Label>
                <Input
                  id="contentUrl"
                  name="contentUrl"
                  value={form.contentUrl}
                  onChange={handleChange}
                  placeholder="https://instagram.com/p/..."
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/assets">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Asset"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
