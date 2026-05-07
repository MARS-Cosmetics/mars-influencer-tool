"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Brand {
  id: string;
  name: string;
}

const PRESET_GOAL_KEYS = [
  "reach",
  "engagement",
  "impressions",
  "videoViews",
  "linkClicks",
  "conversions",
] as const;

type GoalKey = (typeof PRESET_GOAL_KEYS)[number];
type GoalsState = Record<GoalKey, string>;

const EMPTY_GOALS: GoalsState = {
  reach: "",
  engagement: "",
  impressions: "",
  videoViews: "",
  linkClicks: "",
  conversions: "",
};

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brandId: "",
    description: "",
    status: "draft",
    totalBudget: "",
    currency: "INR",
    startDate: "",
    endDate: "",
  });
  const [goals, setGoals] = useState<GoalsState>(EMPTY_GOALS);
  const [customGoals, setCustomGoals] = useState<{ name: string; value: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [campaignRes, brandsRes] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetch("/api/brands"),
        ]);
        if (!campaignRes.ok) throw new Error("Failed to load campaign");
        const campaign = await campaignRes.json();
        const brandPayload = brandsRes.ok ? await brandsRes.json() : null;
        if (cancelled) return;

        // GET /api/brands returns { brands: [...] }, not a bare array.
        const list = Array.isArray(brandPayload)
          ? brandPayload
          : Array.isArray(brandPayload?.brands)
            ? brandPayload.brands
            : [];
        setBrands(list);
        setForm({
          name: campaign.name ?? "",
          brandId: campaign.brandId ?? "",
          description: campaign.description ?? "",
          status: campaign.status ?? "draft",
          totalBudget: campaign.totalBudget ? String(campaign.totalBudget) : "",
          currency: campaign.currency ?? "INR",
          startDate: campaign.startDate
            ? new Date(campaign.startDate).toISOString().split("T")[0]
            : "",
          endDate: campaign.endDate
            ? new Date(campaign.endDate).toISOString().split("T")[0]
            : "",
        });

        // Split goals into preset vs custom
        if (campaign.goals && typeof campaign.goals === "object" && !Array.isArray(campaign.goals)) {
          const presets = { ...EMPTY_GOALS };
          const customs: { name: string; value: string }[] = [];
          for (const [k, v] of Object.entries(campaign.goals as Record<string, unknown>)) {
            if (PRESET_GOAL_KEYS.includes(k as GoalKey)) {
              presets[k as GoalKey] = String(v ?? "");
            } else {
              customs.push({ name: k, value: String(v ?? "") });
            }
          }
          setGoals(presets);
          setCustomGoals(customs);
        }
      } catch {
        toast.error("Failed to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setGoals((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.brandId) {
      toast.error("Name and Brand are required.");
      return;
    }

    const goalsObj: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(goals)) {
      if (v.trim()) {
        const n = parseInt(v, 10);
        if (!isNaN(n)) goalsObj[k] = n;
      }
    }
    for (const cg of customGoals) {
      if (cg.name.trim() && cg.value.trim()) {
        const n = Number(cg.value);
        goalsObj[cg.name.trim()] = isNaN(n) ? cg.value.trim() : n;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalBudget: form.totalBudget || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          goals: Object.keys(goalsObj).length > 0 ? goalsObj : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update campaign");
      }
      toast.success("Campaign updated");
      router.push(`/campaigns/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/campaigns/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand *</Label>
                <select
                  id="brandId"
                  name="brandId"
                  value={form.brandId}
                  onChange={handleChange}
                  required
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
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
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalBudget">Total Budget</Label>
                <Input
                  id="totalBudget"
                  name="totalBudget"
                  type="number"
                  step="0.01"
                  value={form.totalBudget}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Campaign Goals</Label>
              <div className="grid gap-4 md:grid-cols-3">
                {PRESET_GOAL_KEYS.map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </Label>
                    <Input
                      id={key}
                      name={key}
                      type="number"
                      min="0"
                      value={goals[key]}
                      onChange={handleGoalChange}
                    />
                  </div>
                ))}
              </div>

              {customGoals.map((cg, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Goal Name</Label>
                    <Input
                      value={cg.name}
                      onChange={(e) =>
                        setCustomGoals((p) => p.map((g, j) => (j === i ? { ...g, name: e.target.value } : g)))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Target</Label>
                    <Input
                      value={cg.value}
                      onChange={(e) =>
                        setCustomGoals((p) => p.map((g, j) => (j === i ? { ...g, value: e.target.value } : g)))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomGoals((p) => p.filter((_, j) => j !== i))}
                    className="mb-0.5 rounded p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setCustomGoals((p) => [...p, { name: "", value: "" }])}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
                Add Custom Goal
              </button>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin mr-2" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/campaigns/${id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
