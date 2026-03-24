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

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [collaborationOptions, setCollaborationOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    collaborationId: "",
    influencerId: "",
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    amount: "",
    taxAmount: "",
    totalAmount: "",
    currency: "INR",
    fileUrl: "",
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

  useEffect(() => {
    const amount = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.taxAmount) || 0;
    const total = amount + tax;
    setForm((prev) => ({
      ...prev,
      totalAmount: amount > 0 ? total.toFixed(2) : "",
    }));
  }, [form.amount, form.taxAmount]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create invoice");
      }

      toast.success("Invoice created successfully");
      router.push("/invoices");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
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
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={handleChange}
                  required
                  placeholder="INV-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  name="invoiceDate"
                  type="date"
                  value={form.invoiceDate}
                  onChange={handleChange}
                  required
                />
              </div>

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
                <Label htmlFor="amount">Amount (INR) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  name="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.taxAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  type="number"
                  step="0.01"
                  value={form.totalAmount}
                  readOnly
                  className="bg-gray-50"
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/invoices">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
