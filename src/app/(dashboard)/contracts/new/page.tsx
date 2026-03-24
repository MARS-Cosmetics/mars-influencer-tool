"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";

const contractTypes = [
  { value: "exclusivity", label: "Exclusivity" },
  { value: "brand_ambassador", label: "Brand Ambassador" },
  { value: "retainer", label: "Retainer" },
  { value: "one_time", label: "One Time" },
  { value: "nda", label: "NDA" },
];

function formatCount(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    influencerId: "",
    brandId: "",
    collaborationId: "",
    contractType: "",
    title: "",
    description: "",
    fileUrl: "",
    startDate: "",
    endDate: "",
    autoRenew: false,
    contractValue: "",
    currency: "INR",
    paymentTerms: "",
    expiryAlertDays: "30",
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

    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const brands = Array.isArray(data) ? data : data.brands || [];
        setBrandOptions(
          brands.map((b: { id: string; name: string }) => ({
            value: b.id,
            label: b.name,
          }))
        );
      })
      .catch(() => setBrandOptions([]));
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create contract");
      }

      toast.success("Contract created successfully");
      router.push("/contracts");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create contract"
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
        <Link href="/contracts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Contract</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="influencerId">Influencer *</Label>
                <SearchableSelect
                  options={influencerOptions}
                  value={form.influencerId}
                  onChange={(value) => setField("influencerId", value)}
                  placeholder="Select influencer"
                  searchPlaceholder="Search influencers..."
                  emptyMessage="No influencers found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand</Label>
                <SearchableSelect
                  options={brandOptions}
                  value={form.brandId}
                  onChange={(value) => setField("brandId", value)}
                  placeholder="Select brand"
                  searchPlaceholder="Search brands..."
                  emptyMessage="No brands found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type *</Label>
                <select
                  id="contractType"
                  name="contractType"
                  value={form.contractType}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select type</option>
                  {contractTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Contract title"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Contract description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractValue">Contract Value (INR)</Label>
                <Input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.contractValue}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  name="paymentTerms"
                  value={form.paymentTerms}
                  onChange={handleChange}
                  placeholder="e.g. Net 30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaborationId">
                  Collaboration ID (optional)
                </Label>
                <Input
                  id="collaborationId"
                  name="collaborationId"
                  value={form.collaborationId}
                  onChange={handleChange}
                  placeholder="Link to collaboration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryAlertDays">Expiry Alert Days</Label>
                <Input
                  id="expiryAlertDays"
                  name="expiryAlertDays"
                  type="number"
                  min="0"
                  value={form.expiryAlertDays}
                  onChange={handleChange}
                  placeholder="30"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fileUrl">File URL</Label>
                <Input
                  id="fileUrl"
                  name="fileUrl"
                  value={form.fileUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="autoRenew"
                  name="autoRenew"
                  type="checkbox"
                  checked={form.autoRenew}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="autoRenew">Auto Renew</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/contracts">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Contract"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
