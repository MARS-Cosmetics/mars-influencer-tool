"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
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

export default function NewCampaignPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

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

  const [goals, setGoals] = useState({
    reach: "",
    engagement: "",
    impressions: "",
    conversions: "",
    videoViews: "",
    linkClicks: "",
  });

  const [customGoals, setCustomGoals] = useState<{ name: string; value: string }[]>([]);

  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setGoals((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addCustomGoal() {
    setCustomGoals((prev) => [...prev, { name: "", value: "" }]);
  }

  function updateCustomGoal(index: number, field: "name" | "value", val: string) {
    setCustomGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: val } : g))
    );
  }

  function removeCustomGoal(index: number) {
    setCustomGoals((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list: Brand[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.brands)
            ? data.brands
            : [];
        console.log("[campaigns/new] brands loaded:", list);
        setBrands(list);

        // Pick a default brand. Try Mars Cosmetics specifically, then any
        // Mars-family brand, then fall back to the first brand in the list.
        const defaultBrand =
          list.find((b) => b.name?.toLowerCase().includes("mars cosmetics")) ??
          list.find((b) => b.name?.toLowerCase().includes("mars")) ??
          list[0];

        if (defaultBrand) {
          console.log("[campaigns/new] defaulting brand to:", defaultBrand);
          setForm((prev) =>
            prev.brandId ? prev : { ...prev, brandId: defaultBrand.id },
          );
        }
      })
      .catch((err) => {
        console.error("[campaigns/new] brand fetch failed:", err);
        setBrands([]);
      });
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.brandId) {
      toast.error("Name and Brand are required.");
      return;
    }

    // Build goals object from preset + custom fields
    const goalsObj: Record<string, number | string> = {};
    for (const [key, val] of Object.entries(goals)) {
      if (val.trim()) goalsObj[key] = parseInt(val, 10);
    }
    for (const cg of customGoals) {
      if (cg.name.trim() && cg.value.trim()) {
        const num = Number(cg.value);
        goalsObj[cg.name.trim()] = isNaN(num) ? cg.value.trim() : num;
      }
    }
    const goalsPayload = Object.keys(goalsObj).length > 0 ? goalsObj : null;

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalBudget: form.totalBudget || null,
          goals: goalsPayload,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create campaign");
      }

      toast.success("Campaign created successfully!");
      router.push("/campaigns");
    } catch {
      toast.error("Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Campaign</h1>
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
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter campaign name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand *</Label>
                <select
                  id="brandId"
                  name="brandId"
                  value={form.brandId}
                  onChange={handleChange}
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
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
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
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
                  value={form.totalBudget}
                  onChange={handleChange}
                  placeholder="Enter budget amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
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
                placeholder="Campaign description"
              />
            </div>

            <div className="space-y-3">
              <Label>Campaign Goals</Label>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reach" className="text-xs text-muted-foreground">Target Reach</Label>
                  <Input
                    id="reach"
                    name="reach"
                    type="number"
                    min="0"
                    value={goals.reach}
                    onChange={handleGoalChange}
                    placeholder="e.g. 100000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engagement" className="text-xs text-muted-foreground">Target Engagement</Label>
                  <Input
                    id="engagement"
                    name="engagement"
                    type="number"
                    min="0"
                    value={goals.engagement}
                    onChange={handleGoalChange}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="impressions" className="text-xs text-muted-foreground">Target Impressions</Label>
                  <Input
                    id="impressions"
                    name="impressions"
                    type="number"
                    min="0"
                    value={goals.impressions}
                    onChange={handleGoalChange}
                    placeholder="e.g. 500000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="videoViews" className="text-xs text-muted-foreground">Target Video Views</Label>
                  <Input
                    id="videoViews"
                    name="videoViews"
                    type="number"
                    min="0"
                    value={goals.videoViews}
                    onChange={handleGoalChange}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkClicks" className="text-xs text-muted-foreground">Target Link Clicks</Label>
                  <Input
                    id="linkClicks"
                    name="linkClicks"
                    type="number"
                    min="0"
                    value={goals.linkClicks}
                    onChange={handleGoalChange}
                    placeholder="e.g. 2000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conversions" className="text-xs text-muted-foreground">Target Conversions</Label>
                  <Input
                    id="conversions"
                    name="conversions"
                    type="number"
                    min="0"
                    value={goals.conversions}
                    onChange={handleGoalChange}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              {/* Custom goals */}
              {customGoals.map((cg, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Goal Name</Label>
                    <Input
                      value={cg.name}
                      onChange={(e) => updateCustomGoal(i, "name", e.target.value)}
                      placeholder="e.g. Brand Mentions"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Target Value</Label>
                    <Input
                      value={cg.value}
                      onChange={(e) => updateCustomGoal(i, "value", e.target.value)}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomGoal(i)}
                    className="mb-0.5 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addCustomGoal}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="size-4" />
                Add Custom Goal
              </button>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Campaign"}
              </Button>
              <Link href="/campaigns">
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
