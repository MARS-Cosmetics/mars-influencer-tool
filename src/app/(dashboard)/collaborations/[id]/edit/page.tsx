"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "outreach", label: "Outreach" },
  { value: "negotiation", label: "Negotiation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "content_submitted", label: "Content Submitted" },
  { value: "content_approved", label: "Content Approved" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface Snapshot {
  influencerName: string;
  brandName: string;
  campaignName: string | null;
}

const EMPTY_FORM = {
  type: "paid",
  status: "draft",
  agreedAmount: "",
  currency: "INR",
  brief: "",
  dueDate: "",
  contentRating: "",
  ratingNotes: "",
  shopifyTrackingId: "",
  shopifyTrackingUrl: "",
  requiresContentApproval: true as boolean,
};

type FormState = typeof EMPTY_FORM;

export default function EditCollaborationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    influencerName: "",
    brandName: "",
    campaignName: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/collaborations/${id}`);
        if (!res.ok) throw new Error("Failed to load collaboration");
        const c = await res.json();
        if (cancelled) return;

        const str = (v: unknown): string => (v == null ? "" : String(v));
        setForm({
          type: c.type ?? "paid",
          status: c.status ?? "draft",
          agreedAmount: str(c.agreedAmount),
          currency: c.currency ?? "INR",
          brief: str(c.brief),
          dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split("T")[0] : "",
          contentRating: str(c.contentRating),
          ratingNotes: str(c.ratingNotes),
          shopifyTrackingId: str(c.shopifyTrackingId),
          shopifyTrackingUrl: str(c.shopifyTrackingUrl),
          requiresContentApproval: Boolean(c.requiresContentApproval),
        });
        setSnapshot({
          influencerName: c.influencer?.name ?? "",
          brandName: c.brand?.name ?? "",
          campaignName: c.campaign?.name ?? null,
        });
      } catch {
        toast.error("Failed to load collaboration");
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
    const { name, value, type } = e.target as HTMLInputElement;
    const v: string | boolean =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        status: form.status,
        agreedAmount: form.agreedAmount === "" ? null : parseFloat(form.agreedAmount),
        currency: form.currency || null,
        brief: form.brief || null,
        dueDate: form.dueDate || null,
        contentRating: form.contentRating === "" ? null : parseFloat(form.contentRating),
        ratingNotes: form.ratingNotes || null,
        shopifyTrackingId: form.shopifyTrackingId || null,
        shopifyTrackingUrl: form.shopifyTrackingUrl || null,
        requiresContentApproval: form.requiresContentApproval,
      };

      const res = await fetch(`/api/collaborations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // State-machine error responses include a `details` array
        if (Array.isArray(data?.details) && data.details.length > 0) {
          throw new Error(`${data.error}: ${data.details.join("; ")}`);
        }
        throw new Error(data.error || "Failed to update collaboration");
      }
      toast.success("Collaboration updated");
      router.push(`/collaborations/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update collaboration");
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={`/collaborations/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Collaboration</h1>
          <p className="text-sm text-muted-foreground">
            {snapshot.influencerName} × {snapshot.brandName}
            {snapshot.campaignName ? ` — ${snapshot.campaignName}` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Influencer, brand, campaign, products, and assignee can&apos;t be changed
        from this page — they define the collaboration. To re-link any of those,
        cancel this collaboration and create a new one.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Collaboration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select id="type" name="type" value={form.type} onChange={handleChange} className={selectClass}>
                  <option value="paid">Paid</option>
                  <option value="barter">Barter</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" value={form.status} onChange={handleChange} className={selectClass}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">State-machine rules still apply.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreedAmount">Agreed Amount</Label>
                <Input id="agreedAmount" name="agreedAmount" type="number" step="0.01" value={form.agreedAmount} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" name="currency" value={form.currency} onChange={handleChange} className={selectClass}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="requiresContentApproval"
                    checked={form.requiresContentApproval}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Require content approval before publishing
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <Textarea id="brief" name="brief" value={form.brief} onChange={handleChange} rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contentRating">Rating (0-5)</Label>
                <Input
                  id="contentRating"
                  name="contentRating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.contentRating}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratingNotes">Rating Notes</Label>
              <Textarea id="ratingNotes" name="ratingNotes" value={form.ratingNotes} onChange={handleChange} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shopifyTrackingId">Tracking ID</Label>
                <Input id="shopifyTrackingId" name="shopifyTrackingId" value={form.shopifyTrackingId} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopifyTrackingUrl">Tracking URL</Label>
                <Input id="shopifyTrackingUrl" name="shopifyTrackingUrl" value={form.shopifyTrackingUrl} onChange={handleChange} placeholder="https://..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/collaborations/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
