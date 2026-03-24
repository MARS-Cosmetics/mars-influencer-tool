"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function NewContentIdeaPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brandOptions, setBrandOptions] = useState<SearchableSelectOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<SearchableSelectOption[]>([]);
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [collaborationOptions, setCollaborationOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    theme: "other",
    platform: "",
    contentType: "",
    status: "idea",
    priority: "medium",
    brandId: "",
    campaignId: "",
    influencerId: "",
    collaborationId: "",
    referenceUrls: "",
    moodboardUrl: "",
    notes: "",
    targetDate: "",
  });

  useEffect(() => {
    // Fetch brands
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list = data.brands || [];
        setBrandOptions(
          list.map((b: { id: string; name: string }) => ({
            value: b.id,
            label: b.name,
          }))
        );
      });

    // Fetch campaigns
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        const list = data.campaigns || [];
        setCampaignOptions(
          list.map(
            (c: {
              id: string;
              name: string;
              status?: string;
              brand?: { name: string };
            }) => ({
              value: c.id,
              label: c.name,
              sublabel: [c.brand?.name, c.status].filter(Boolean).join(" · "),
            })
          )
        );
      });

    // Fetch influencers
    fetch("/api/influencers?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const list = data.influencers || [];
        setInfluencerOptions(
          list.map(
            (inf: {
              id: string;
              name: string;
              instagramHandle?: string;
              tier?: string;
              city?: string;
            }) => ({
              value: inf.id,
              label: inf.name,
              sublabel: [
                inf.instagramHandle ? `@${inf.instagramHandle}` : null,
                inf.tier,
                inf.city,
              ]
                .filter(Boolean)
                .join(" · "),
            })
          )
        );
      });

    // Fetch collaborations
    fetch("/api/collaborations?limit=200")
      .then((r) => r.json())
      .then((data) => {
        const list = data.collaborations || [];
        setCollaborationOptions(
          list.map(
            (c: {
              id: string;
              influencer: { name: string };
              brand: { name: string };
              status: string;
            }) => ({
              value: c.id,
              label: `${c.influencer.name} x ${c.brand.name}`,
              sublabel: c.status.replace(/_/g, " "),
            })
          )
        );
      });
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = { ...form };

      // Remove empty optional fields
      const optionalFields = [
        "description",
        "platform",
        "contentType",
        "brandId",
        "campaignId",
        "influencerId",
        "collaborationId",
        "moodboardUrl",
        "notes",
        "targetDate",
      ];
      for (const field of optionalFields) {
        if (!payload[field]) delete payload[field];
      }

      // referenceUrls will be processed by the API

      const response = await fetch("/api/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create content idea");
      }

      toast.success("Content idea created successfully");
      router.push("/content-ideas");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create content idea"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content-ideas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Content Idea</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Diwali Unboxing Reel"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the content idea..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select
                id="theme"
                name="theme"
                value={form.theme}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="festival">Festival</option>
                <option value="launch">Launch</option>
                <option value="tutorial">Tutorial</option>
                <option value="grwm">GRWM</option>
                <option value="haul">Haul</option>
                <option value="review">Review</option>
                <option value="unboxing">Unboxing</option>
                <option value="challenge">Challenge</option>
                <option value="collab">Collab</option>
                <option value="seasonal">Seasonal</option>
                <option value="trending">Trending</option>
                <option value="educational">Educational</option>
                <option value="behind_the_scenes">Behind the Scenes</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <select
                id="platform"
                name="platform"
                value={form.platform}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Select platform...</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="blog">Blog</option>
                <option value="other">Other</option>
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
                <option value="">Select content type...</option>
                <option value="reel">Reel</option>
                <option value="static_post">Static Post</option>
                <option value="carousel">Carousel</option>
                <option value="video">Video</option>
                <option value="short">Short</option>
                <option value="tweet">Tweet</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Priority</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="idea">Idea</option>
                <option value="approved">Approved</option>
                <option value="briefed">Briefed</option>
                <option value="in_production">In Production</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand</Label>
              <SearchableSelect
                options={brandOptions}
                value={form.brandId}
                onChange={(v) => setField("brandId", v)}
                placeholder="Select brand..."
                searchPlaceholder="Search brands..."
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign</Label>
              <SearchableSelect
                options={campaignOptions}
                value={form.campaignId}
                onChange={(v) => setField("campaignId", v)}
                placeholder="Select campaign..."
                searchPlaceholder="Search campaigns..."
              />
            </div>

            <div className="space-y-2">
              <Label>Influencer</Label>
              <SearchableSelect
                options={influencerOptions}
                value={form.influencerId}
                onChange={(v) => setField("influencerId", v)}
                placeholder="Select influencer..."
                searchPlaceholder="Search influencers..."
              />
            </div>

            <div className="space-y-2">
              <Label>Collaboration (optional)</Label>
              <SearchableSelect
                options={collaborationOptions}
                value={form.collaborationId}
                onChange={(v) => setField("collaborationId", v)}
                placeholder="Select collaboration..."
                searchPlaceholder="Search collaborations..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referenceUrls">Reference URLs</Label>
              <Textarea
                id="referenceUrls"
                name="referenceUrls"
                value={form.referenceUrls}
                onChange={handleChange}
                placeholder="Paste reference URLs, one per line..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Enter one URL per line
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moodboardUrl">Moodboard URL</Label>
              <Input
                id="moodboardUrl"
                name="moodboardUrl"
                value={form.moodboardUrl}
                onChange={handleChange}
                placeholder="e.g. https://pinterest.com/board/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                name="targetDate"
                type="date"
                value={form.targetDate}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/content-ideas">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Content Idea
          </Button>
        </div>
      </form>
    </div>
  );
}
