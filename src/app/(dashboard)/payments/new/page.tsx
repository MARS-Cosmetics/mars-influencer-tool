"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "razorpay", label: "Razorpay" },
  { value: "other", label: "Other" },
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
  agencyId?: string;
  agencyNameSnapshot?: string;
  agencyCommissionPct?: number;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [collaborationOptions, setCollaborationOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    collaborationId: "",
    influencerId: "",
    amount: "",
    currency: "INR",
    tdsPercentage: "",
    tdsAmount: "",
    netAmount: "",
    paymentMethod: "",
    transactionRef: "",
    invoiceId: "",
    agencyId: "",
    agencyCommissionPct: "",
    agencyCommissionAmount: "",
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
          const collabs = data.collaborations || [];
          setCollaborations(collabs);
          setCollaborationOptions(
            collabs.map((c: Collaboration) => ({
              value: c.id,
              label: c.type + (c.brand ? ` - ${c.brand.name}` : ""),
            }))
          );
        });
    } else {
      setCollaborations([]);
      setCollaborationOptions([]);
    }
  }, [form.influencerId]);

  // Auto-populate agency info when collaboration is selected
  useEffect(() => {
    if (form.collaborationId) {
      const collab = collaborations.find((c) => c.id === form.collaborationId);
      if (collab?.agencyId) {
        setForm((prev) => ({
          ...prev,
          agencyId: collab.agencyId || "",
          agencyCommissionPct: collab.agencyCommissionPct?.toString() || "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          agencyId: "",
          agencyCommissionPct: "",
          agencyCommissionAmount: "",
        }));
      }
    }
  }, [form.collaborationId, collaborations]);

  // Auto-calculate TDS and agency commission
  useEffect(() => {
    const amount = parseFloat(form.amount) || 0;
    const tdsPercent = parseFloat(form.tdsPercentage) || 0;
    const agencyPct = parseFloat(form.agencyCommissionPct) || 0;
    const tdsAmt = (amount * tdsPercent) / 100;
    const net = amount - tdsAmt;
    const agencyAmt = (amount * agencyPct) / 100;
    setForm((prev) => ({
      ...prev,
      tdsAmount: tdsAmt > 0 ? tdsAmt.toFixed(2) : "",
      netAmount: amount > 0 ? net.toFixed(2) : "",
      agencyCommissionAmount: agencyAmt > 0 ? agencyAmt.toFixed(2) : "",
    }));
  }, [form.amount, form.tdsPercentage, form.agencyCommissionPct]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create payment");
      }

      toast.success("Payment created successfully");
      router.push("/payments");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create payment"
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
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Payment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
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
                <Label htmlFor="tdsPercentage">TDS %</Label>
                <Input
                  id="tdsPercentage"
                  name="tdsPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.tdsPercentage}
                  onChange={handleChange}
                  placeholder="e.g. 10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tdsAmount">TDS Amount</Label>
                <Input
                  id="tdsAmount"
                  name="tdsAmount"
                  type="number"
                  step="0.01"
                  value={form.tdsAmount}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="netAmount">Net Amount</Label>
                <Input
                  id="netAmount"
                  name="netAmount"
                  type="number"
                  step="0.01"
                  value={form.netAmount}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select method</option>
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionRef">Transaction Reference</Label>
                <Input
                  id="transactionRef"
                  name="transactionRef"
                  value={form.transactionRef}
                  onChange={handleChange}
                  placeholder="Transaction ID or reference"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice ID (optional)</Label>
                <Input
                  id="invoiceId"
                  name="invoiceId"
                  value={form.invoiceId}
                  onChange={handleChange}
                  placeholder="Link to invoice"
                />
              </div>
            </div>

            {/* Agency Commission Section */}
            {form.agencyId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <Building2 className="h-4 w-4" />
                  Agency Commission
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="agencyCommissionPct" className="text-xs">Commission %</Label>
                    <Input
                      id="agencyCommissionPct"
                      name="agencyCommissionPct"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.agencyCommissionPct}
                      onChange={handleChange}
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Commission Amount</Label>
                    <Input
                      value={form.agencyCommissionAmount ? `₹${parseFloat(form.agencyCommissionAmount).toLocaleString("en-IN")}` : ""}
                      readOnly
                      className="bg-blue-100/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Net after Agency</Label>
                    <Input
                      value={form.netAmount && form.agencyCommissionAmount
                        ? `₹${(parseFloat(form.netAmount) - parseFloat(form.agencyCommissionAmount)).toLocaleString("en-IN")}`
                        : form.netAmount ? `₹${parseFloat(form.netAmount).toLocaleString("en-IN")}` : ""}
                      readOnly
                      className="bg-blue-100/50"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/payments">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
