"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Package,
  Building2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";

function formatCount(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

interface InfluencerDetail {
  id: string;
  name: string;
  instagramHandle?: string;
  tier?: string;
  city?: string;
  igFollowerCount?: number;
  igEngagementRate?: number;
  addressLine1?: string;
  agencyId?: string;
  managedBy?: string;
}

interface AgencyDetail {
  id: string;
  name: string;
  contactPerson?: string;
  commissionPct?: number;
}

interface DeliverableRow {
  platform: string;
  contentType: string;
  dueDate: string;
  hasAdRights: boolean;
  notes: string;
}

interface ProductRow {
  productId: string;
  quantity: number;
  duplicateChecked: boolean;
  duplicateAcknowledged: boolean;
  duplicateInfo: {
    found: boolean;
    count?: number;
    lastDate?: string;
    lastType?: string;
  } | null;
  stockInfo: {
    inStock: boolean;
    quantity?: number;
    productName?: string;
  } | null;
}

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "reel", label: "Reel" },
  { value: "static_post", label: "Static Post" },
  { value: "carousel", label: "Carousel" },
  { value: "video", label: "Video" },
  { value: "short", label: "Short" },
  { value: "tweet", label: "Tweet" },
  { value: "article", label: "Article" },
  { value: "other", label: "Other" },
];


const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const tierColors: Record<string, string> = {
  nano: "bg-gray-100 text-gray-700",
  micro: "bg-blue-100 text-blue-700",
  mid: "bg-purple-100 text-purple-700",
  macro: "bg-orange-100 text-orange-700",
  mega: "bg-red-100 text-red-700",
};

export default function NewCollaborationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SearchableSelectOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<SearchableSelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SearchableSelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SearchableSelectOption[]>([]);
  const [paymentTermOptions, setPaymentTermOptions] = useState<SearchableSelectOption[]>([]);

  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerDetail | null>(null);
  const [isLoadingInfluencer, setIsLoadingInfluencer] = useState(false);
  const [addressCheck, setAddressCheck] = useState<"unchecked" | "has_address" | "no_address">("unchecked");

  // Agency state
  const [agencyDetail, setAgencyDetail] = useState<AgencyDetail | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);

  // Deliverables rows
  const [deliverableRows, setDeliverableRows] = useState<DeliverableRow[]>([
    { platform: "instagram", contentType: "reel", dueDate: "", hasAdRights: false, notes: "" },
  ]);

  // Products state
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pendingProductId, setPendingProductId] = useState("");
  const [pendingProductQty, setPendingProductQty] = useState(1);

  const [requiresContentApproval, setRequiresContentApproval] = useState(true);

  const [form, setForm] = useState({
    influencerId: "",
    brandId: "",
    campaignId: "",
    assignedTo: "",
    type: "paid",
    status: "draft",
    agreedAmount: "",
    currency: "INR",
    paymentTermId: "",
    brief: "",
    deliverables: "",
    agencyId: "",
    agencyNameSnapshot: "",
    agencyCommissionPct: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch influencers
    fetch("/api/influencers?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const list = data.influencers || [];
        setInfluencerOptions(
          list.map((inf: { id: string; name: string; instagramHandle?: string; igFollowerCount?: number; tier?: string; city?: string }) => ({
            value: inf.id,
            label: inf.name,
            sublabel: [
              inf.instagramHandle ? `@${inf.instagramHandle}` : null,
              inf.tier,
              inf.igFollowerCount ? formatCount(inf.igFollowerCount) + " followers" : null,
              inf.city,
            ]
              .filter(Boolean)
              .join(" · "),
          }))
        );
      });

    // Fetch brands and auto-select first
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list = data.brands || [];
        const opts = list.map((b: { id: string; name: string }) => ({
          value: b.id,
          label: b.name,
        }));
        setBrandOptions(opts);
        // Auto-select first brand
        if (opts.length > 0) {
          setForm((prev) => ({ ...prev, brandId: opts[0].value }));
        }
      });

    // Fetch campaigns
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        const list = data.campaigns || [];
        setCampaignOptions(
          list.map((c: { id: string; name: string; status?: string; brand?: { name: string } }) => ({
            value: c.id,
            label: c.name,
            sublabel: [c.brand?.name, c.status].filter(Boolean).join(" · "),
          }))
        );
      });

    // Fetch users
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        const list = data.users || [];
        setUserOptions(
          list.map((u: { id: string; name: string; email: string; role: string }) => ({
            value: u.id,
            label: u.name,
            sublabel: `${u.email} · ${u.role}`,
          }))
        );
      });

    // Fetch payment terms
    fetch("/api/payment-terms")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const opts = list.map((pt: { id: string; name: string; description?: string; isDefault?: boolean; installments?: Array<{ percentage: number; label: string }> }) => ({
          value: pt.id,
          label: pt.name,
          sublabel: pt.installments
            ? pt.installments.map((i: { percentage: number; label: string }) => `${i.percentage}% ${i.label}`).join(" + ")
            : pt.description || "",
        }));
        setPaymentTermOptions(opts);
        // Auto-select default term
        const defaultTerm = list.find((pt: { isDefault?: boolean }) => pt.isDefault);
        if (defaultTerm) {
          setForm((prev) => ({ ...prev, paymentTermId: defaultTerm.id }));
        }
      });

    // Fetch products
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.products || [];
        setProductOptions(
          list.map((p: { id: string; name: string; sku?: string; brand?: { name: string } }) => ({
            value: p.id,
            label: p.name,
            sublabel: [p.sku, p.brand?.name].filter(Boolean).join(" · "),
          }))
        );
      });
  }, []);

  // Fetch influencer details when selected
  useEffect(() => {
    if (!form.influencerId) {
      setSelectedInfluencer(null);
      setAddressCheck("unchecked");
      setAgencyDetail(null);
      setForm((prev) => ({
        ...prev,
        agencyId: "",
        agencyNameSnapshot: "",
        agencyCommissionPct: "",
      }));
      return;
    }

    setIsLoadingInfluencer(true);
    fetch(`/api/influencers/${form.influencerId}`)
      .then((r) => r.json())
      .then((data) => {
        const inf: InfluencerDetail = {
          id: data.id,
          name: data.name,
          instagramHandle: data.instagramHandle,
          tier: data.tier,
          city: data.city,
          igFollowerCount: data.igFollowerCount,
          igEngagementRate: data.igEngagementRate,
          addressLine1: data.addressLine1,
          agencyId: data.agencyId,
          managedBy: data.managedBy,
        };
        setSelectedInfluencer(inf);
        setAddressCheck(data.addressLine1 ? "has_address" : "no_address");

        // Fetch agency if managed by agency
        if (data.managedBy === "agency" && data.agencyId) {
          setIsLoadingAgency(true);
          fetch(`/api/agencies/${data.agencyId}`)
            .then((r) => r.json())
            .then((agencyData) => {
              setAgencyDetail({
                id: agencyData.id,
                name: agencyData.name,
                contactPerson: agencyData.contactPerson,
                commissionPct: agencyData.commissionPct,
              });
              setForm((prev) => ({
                ...prev,
                agencyId: agencyData.id || "",
                agencyNameSnapshot: agencyData.name || "",
                agencyCommissionPct: agencyData.commissionPct?.toString() || "",
              }));
            })
            .catch(() => {
              setAgencyDetail(null);
            })
            .finally(() => setIsLoadingAgency(false));
        } else {
          setAgencyDetail(null);
          setForm((prev) => ({
            ...prev,
            agencyId: "",
            agencyNameSnapshot: "",
            agencyCommissionPct: "",
          }));
        }
      })
      .catch(() => {
        setSelectedInfluencer(null);
        setAddressCheck("unchecked");
        setAgencyDetail(null);
      })
      .finally(() => setIsLoadingInfluencer(false));
  }, [form.influencerId]);

  // Run product duplicate checks when influencer changes
  useEffect(() => {
    if (!form.influencerId || products.length === 0) return;
    products.forEach((p, idx) => {
      if (p.productId && !p.duplicateChecked) {
        checkDuplicate(idx, p.productId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.influencerId]);

  const checkDuplicate = useCallback(
    async (index: number, productId: string) => {
      if (!form.influencerId) return;
      try {
        const res = await fetch(
          `/api/product-check?influencerId=${form.influencerId}&productId=${productId}`
        );
        const data = await res.json();
        setProducts((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              duplicateChecked: true,
              duplicateInfo: data.found
                ? { found: true, count: data.count, lastDate: data.lastDate, lastType: data.lastType }
                : { found: false },
            };
          }
          return updated;
        });
      } catch {
        // Silently fail duplicate check
      }
    },
    [form.influencerId]
  );

  const checkStock = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/shopify/stock-check?productIds=${productIds.join(",")}`
      );
      const data = await res.json();
      const stockMap: Record<string, { inStock: boolean; quantity?: number; productName?: string }> =
        {};
      if (data.results) {
        for (const item of data.results) {
          stockMap[item.productId] = {
            inStock: item.inStock,
            quantity: item.quantity,
            productName: item.productName,
          };
        }
      }
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          stockInfo: stockMap[p.productId] || p.stockInfo,
        }))
      );
    } catch {
      // Silently fail stock check
    }
  }, []);

  function handleAddProduct() {
    if (!pendingProductId) {
      toast.error("Please select a product");
      return;
    }
    const newProduct: ProductRow = {
      productId: pendingProductId,
      quantity: pendingProductQty,
      duplicateChecked: false,
      duplicateAcknowledged: false,
      duplicateInfo: null,
      stockInfo: null,
    };
    const newIndex = products.length;
    setProducts((prev) => [...prev, newProduct]);
    setPendingProductId("");
    setPendingProductQty(1);

    // Run duplicate check
    if (form.influencerId) {
      checkDuplicate(newIndex, pendingProductId);
    }

    // Run stock check
    checkStock([pendingProductId]);
  }

  function handleRemoveProduct(index: number) {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAcknowledgeDuplicate(index: number) {
    setProducts((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], duplicateAcknowledged: true };
      }
      return updated;
    });
  }

  // Deliverable row helpers
  function addDeliverableRow() {
    setDeliverableRows((prev) => [
      ...prev,
      { platform: "instagram", contentType: "reel", dueDate: "", hasAdRights: false, notes: "" },
    ]);
  }

  function removeDeliverableRow(index: number) {
    setDeliverableRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDeliverableRow(index: number, field: keyof DeliverableRow, value: string | number | boolean) {
    setDeliverableRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Auto-toggle content approval based on type
    if (name === "type") {
      setRequiresContentApproval(value === "paid");
    }
  }

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  const hasOutOfStock = products.some(
    (p) => p.stockInfo && !p.stockInfo.inStock
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: Record<string, boolean> = {};
    if (!form.influencerId) errors.influencerId = true;
    if (!form.brandId) errors.brandId = true;
    if (!form.assignedTo) errors.assignedTo = true;
    if (!form.type) errors.type = true;
    if (form.type === "paid" && !form.agreedAmount) errors.agreedAmount = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const fieldNames = Object.keys(errors).map(k => {
        const map: Record<string, string> = { influencerId: "Influencer", brandId: "Brand", assignedTo: "Assigned To", type: "Type", agreedAmount: "Agreed Amount" };
        return map[k] || k;
      });
      toast.error(`Please fill required fields: ${fieldNames.join(", ")}`);
      return;
    }
    setFormErrors({});

    if (addressCheck === "no_address") {
      toast.error("Influencer must have an address before creating a collaboration");
      return;
    }

    if (hasOutOfStock) {
      toast.error("Please remove out-of-stock products before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build deliverables JSON from rows
      const deliverablesJson = JSON.stringify(
        deliverableRows.map((r) => ({
          platform: r.platform,
          type: r.contentType,
          dueDate: r.dueDate || undefined,
          hasAdRights: r.hasAdRights,
          notes: r.notes || undefined,
        }))
      );

      const payload: Record<string, unknown> = {
        ...form,
        requiresContentApproval,
        deliverables: deliverablesJson,
        products: products.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        })),
      };

      // Remove empty optional fields
      if (!payload.campaignId) delete payload.campaignId;
      if (!payload.agreedAmount) delete payload.agreedAmount;
      if (!payload.paymentTermId || form.type !== "paid") delete payload.paymentTermId;
      if (!payload.brief) delete payload.brief;
      if (!payload.agencyId) delete payload.agencyId;
      if (!payload.agencyNameSnapshot) delete payload.agencyNameSnapshot;
      if (!payload.agencyCommissionPct) delete payload.agencyCommissionPct;

      const response = await fetch("/api/collaborations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create collaboration");
      }

      toast.success("Collaboration created successfully");
      router.push("/collaborations");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create collaboration"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled = isSubmitting || addressCheck === "no_address" || hasOutOfStock;

  const getProductName = (productId: string) => {
    const opt = productOptions.find((o) => o.value === productId);
    return opt?.label || productId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/collaborations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Collaboration</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Influencer <span className="text-red-500">*</span></div>
              <SearchableSelect
                options={influencerOptions}
                value={form.influencerId}
                onChange={(v) => setField("influencerId", v)}
                placeholder="Search influencer..."
                searchPlaceholder="Type name or handle..."
                emptyMessage="No influencers found."
                className={formErrors.influencerId ? "ring-2 ring-red-500 rounded-lg" : ""}
              />

              {/* Influencer info card */}
              {isLoadingInfluencer && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Loader2 className="size-3 animate-spin" /> Loading influencer details...
                </div>
              )}

              {selectedInfluencer && !isLoadingInfluencer && (
                <div className="mt-2 rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{selectedInfluencer.name}</span>
                    {selectedInfluencer.instagramHandle && (
                      <a
                        href={`https://instagram.com/${selectedInfluencer.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        @{selectedInfluencer.instagramHandle}
                      </a>
                    )}
                    {selectedInfluencer.tier && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${tierColors[selectedInfluencer.tier] || "bg-gray-100 text-gray-700"}`}>
                        {selectedInfluencer.tier}
                      </span>
                    )}
                    {selectedInfluencer.city && (
                      <span className="text-xs text-muted-foreground">{selectedInfluencer.city}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {selectedInfluencer.igFollowerCount != null && (
                      <span>{formatCount(selectedInfluencer.igFollowerCount)} followers</span>
                    )}
                    {selectedInfluencer.igEngagementRate != null && (
                      <span>{selectedInfluencer.igEngagementRate}% engagement</span>
                    )}
                  </div>
                </div>
              )}

              {/* Agency snapshot */}
              {selectedInfluencer && !isLoadingInfluencer && (
                <>
                  {isLoadingAgency && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Loader2 className="size-3 animate-spin" /> Loading agency details...
                    </div>
                  )}

                  {selectedInfluencer.managedBy === "agency" && agencyDetail && !isLoadingAgency && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Agency</span>
                      </div>
                      <div className="grid gap-1 text-sm text-blue-800">
                        <div>
                          <span className="text-blue-600">Name:</span> {agencyDetail.name}
                        </div>
                        {agencyDetail.contactPerson && (
                          <div>
                            <span className="text-blue-600">Contact:</span> {agencyDetail.contactPerson}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">Commission %:</span>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={form.agencyCommissionPct}
                            onChange={(e) => setField("agencyCommissionPct", e.target.value)}
                            className="h-7 w-24 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedInfluencer.managedBy !== "agency" && !isLoadingAgency && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-4 text-muted-foreground" />
                      Self-managed
                    </div>
                  )}
                </>
              )}

              {/* Address validation */}
              {addressCheck === "no_address" && selectedInfluencer && (
                <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm text-yellow-800">
                        This influencer doesn&apos;t have an address on file. An address is required before proceeding with a collaboration.
                      </p>
                      <Link
                        href={`/influencers/${selectedInfluencer.id}/edit`}
                        className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline underline-offset-2"
                      >
                        Complete Influencer Profile &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {addressCheck === "has_address" && selectedInfluencer && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="size-4" />
                  Address verified
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Brand <span className="text-red-500">*</span></div>
              <SearchableSelect
                options={brandOptions}
                value={form.brandId}
                onChange={(v) => setField("brandId", v)}
                placeholder="Select brand..."
                searchPlaceholder="Search brands..."
                className={formErrors.brandId ? "ring-2 ring-red-500 rounded-lg" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign (optional)</Label>
              <SearchableSelect
                options={campaignOptions}
                value={form.campaignId}
                onChange={(v) => setField("campaignId", v)}
                placeholder="Select campaign..."
                searchPlaceholder="Search campaigns..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Assigned To <span className="text-red-500">*</span></div>
              <SearchableSelect
                options={userOptions}
                value={form.assignedTo}
                onChange={(v) => setField("assignedTo", v)}
                placeholder="Select team member..."
                searchPlaceholder="Search by name or email..."
                className={formErrors.assignedTo ? "ring-2 ring-red-500 rounded-lg" : ""}
              />
            </div>
          </CardContent>
        </Card>

        {/* Type & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Type & Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Collaboration Type <span className="text-red-500">*</span></div>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                required
                className={`${selectClass} ${formErrors.type ? "ring-2 ring-red-500" : ""}`}
              >
                <option value="paid">Paid</option>
                <option value="barter">Barter</option>
                <option value="pr_gifting">PR Gifting</option>
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
                <option value="draft">Draft</option>
                <option value="outreach">Outreach</option>
                <option value="negotiation">Negotiation</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="content_submitted">Content Submitted</option>
                <option value="content_approved">Content Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2 md:col-span-2 pt-2">
              <input
                type="checkbox"
                id="requiresContentApproval"
                checked={requiresContentApproval}
                onChange={(e) => setRequiresContentApproval(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="requiresContentApproval" className="cursor-pointer text-sm">
                Requires Content Approval
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Deliverables (each row = one asset) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Deliverables</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDeliverableRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Deliverable
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverableRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No deliverables added. Click &quot;Add Deliverable&quot; to start.
              </p>
            )}
            {deliverableRows.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 items-end md:grid-cols-[1fr_1fr_140px_80px_1fr_40px] grid-cols-[1fr_1fr_40px]"
              >
                <div className="space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Platform</Label>
                  )}
                  <select
                    value={row.platform}
                    onChange={(e) => updateDeliverableRow(index, "platform", e.target.value)}
                    className={selectClass}
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Content Type</Label>
                  )}
                  <select
                    value={row.contentType}
                    onChange={(e) => updateDeliverableRow(index, "contentType", e.target.value)}
                    className={selectClass}
                  >
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 hidden md:block">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                  )}
                  <Input
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => updateDeliverableRow(index, "dueDate", e.target.value)}
                  />
                </div>

                <div className="space-y-1 hidden md:flex md:flex-col md:items-center">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Ad Rights</Label>
                  )}
                  <div className="flex items-center h-9">
                    <input
                      type="checkbox"
                      checked={row.hasAdRights}
                      onChange={(e) => updateDeliverableRow(index, "hasAdRights", e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                  </div>
                </div>

                <div className="space-y-1 hidden md:block">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                  )}
                  <Input
                    value={row.notes}
                    onChange={(e) => updateDeliverableRow(index, "notes", e.target.value)}
                    placeholder="Optional notes..."
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeDeliverableRow(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add product row */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Product</Label>
                <SearchableSelect
                  options={productOptions}
                  value={pendingProductId}
                  onChange={(v) => setPendingProductId(v)}
                  placeholder="Search products..."
                  searchPlaceholder="Type product name or SKU..."
                  emptyMessage="No products found."
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs text-muted-foreground">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={pendingProductQty}
                  onChange={(e) => setPendingProductQty(parseInt(e.target.value) || 1)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleAddProduct}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </div>

            {/* Product list */}
            {products.length > 0 && (
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={index} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getProductName(product.productId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Qty: {product.quantity}
                        </span>

                        {/* Stock badge */}
                        {product.stockInfo && product.stockInfo.inStock && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="size-3" />
                            In stock ({product.stockInfo.quantity} units)
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Out of stock warning */}
                    {product.stockInfo && !product.stockInfo.inStock && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="size-4 text-red-600 shrink-0" />
                          <p className="text-sm text-red-800">
                            {product.stockInfo.productName || getProductName(product.productId)} is out of stock. Please change the product.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Duplicate warning */}
                    {product.duplicateInfo?.found && !product.duplicateAcknowledged && (
                      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <p className="text-sm text-yellow-800">
                              This product was sent to this influencer {product.duplicateInfo.count} time(s) before.
                              {product.duplicateInfo.lastDate &&
                                ` Last sent on ${product.duplicateInfo.lastDate}`}
                              {product.duplicateInfo.lastType &&
                                ` via ${product.duplicateInfo.lastType}`}
                              . Do you want to continue?
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleAcknowledgeDuplicate(index)}
                              >
                                Yes, continue
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 hover:text-red-700"
                                onClick={() => handleRemoveProduct(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {product.duplicateInfo?.found && product.duplicateAcknowledged && (
                      <p className="text-xs text-yellow-600">
                        Duplicate acknowledged ({product.duplicateInfo.count} previous send(s))
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No products added yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Commercials */}
        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Agreed Amount {form.type === "paid" && <span className="text-red-500">*</span>}</div>
              <Input
                id="agreedAmount"
                name="agreedAmount"
                type="number"
                step="0.01"
                value={form.type === "barter" ? "" : form.agreedAmount}
                onChange={handleChange}
                placeholder={form.type === "barter" ? "N/A (Barter)" : "e.g. 50000"}
                disabled={form.type === "barter"}
                className={formErrors.agreedAmount ? "ring-2 ring-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* Payment Terms - only for paid collaborations */}
            {form.type === "paid" && (
              <div className="space-y-2 md:col-span-2">
                <Label>Payment Terms</Label>
                <SearchableSelect
                  options={paymentTermOptions}
                  value={form.paymentTermId}
                  onChange={(v) => setField("paymentTermId", v)}
                  placeholder="Select payment terms..."
                  searchPlaceholder="Search terms..."
                  emptyMessage="No payment terms found. Create one in Settings → Payment Terms."
                />
                {form.paymentTermId && form.agreedAmount && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Payment Schedule Preview:</p>
                    <div className="space-y-1">
                      {(() => {
                        const term = paymentTermOptions.find((o) => o.value === form.paymentTermId);
                        const amount = parseFloat(form.agreedAmount) || 0;
                        if (!term?.sublabel || !amount) return null;
                        return term.sublabel.split(" + ").map((part, i) => {
                          const match = part.match(/(\d+)%\s+(.*)/);
                          if (!match) return null;
                          const pct = parseInt(match[1]);
                          const label = match[2];
                          const instAmount = Math.round(amount * pct / 100 * 100) / 100;
                          return (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{label}</span>
                              <span className="font-medium">₹{instAmount.toLocaleString("en-IN")}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <Textarea
                id="brief"
                name="brief"
                value={form.brief}
                onChange={handleChange}
                placeholder="Describe the collaboration brief..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/collaborations">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Collaboration
          </Button>
        </div>
      </form>
    </div>
  );
}
