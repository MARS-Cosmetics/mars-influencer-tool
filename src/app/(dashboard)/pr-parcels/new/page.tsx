"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle2, Package, ExternalLink, MapPin, Phone, Mail, MessageSquare, CreditCard, Tag, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";

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
  igEngagementRate?: number | string | null;
  addressLine1?: string;
  addressLine2?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  upiId?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  paymentPreference?: string;
  panNumber?: string;
  gstin?: string;
  categories?: string[];
  contentNiches?: string[];
}

interface ProductDetail {
  id: string;
  name: string;
  sku: string | null;
  brandId: string;
  brand?: { name: string };
  category?: string;
  mrp?: number;
  shopifyVariantId?: string | null;
  shopifyProductId?: string | null;
}

interface ParcelProduct {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  shopifyVariantId?: string | null;
}

interface StockResult {
  productId: string;
  inStock: boolean;
  quantity?: number;
  productName?: string;
}

const tierColors: Record<string, string> = {
  nano: "bg-gray-100 text-gray-700",
  micro: "bg-blue-100 text-blue-700",
  mid: "bg-purple-100 text-purple-700",
  macro: "bg-orange-100 text-orange-700",
  mega: "bg-red-100 text-red-700",
};

export default function NewPrParcelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Data sources
  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDetail[]>([]);
  const [productOptions, setProductOptions] = useState<SearchableSelectOption[]>([]);

  // Step 1: Influencer — either pick an existing one or quick-add a new
  // recipient inline (for one-off PR sends to people not in the catalog).
  const [recipientMode, setRecipientMode] = useState<"existing" | "quick">(
    "existing",
  );
  const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerDetail | null>(null);
  const [isLoadingInfluencer, setIsLoadingInfluencer] = useState(false);

  // Quick-add fields. Persist what the user typed even if they toggle modes
  // so a slip of the radio button doesn't wipe their work.
  const [quickName, setQuickName] = useState("");
  const [quickHandle, setQuickHandle] = useState("");
  const [quickAddress1, setQuickAddress1] = useState("");
  const [quickAddress2, setQuickAddress2] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [quickState, setQuickState] = useState("");
  const [quickPincode, setQuickPincode] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  // Profile metrics fetched from CreatorX/Bright Data when user clicks
  // "Lookup". Stored separately from the raw form fields so we can show
  // a preview AND pass everything to /api/influencers POST.
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupProfile, setLookupProfile] = useState<{
    source?: string;
    handle?: string;
    name?: string;
    bio?: string | null;
    profileImageUrl?: string | null;
    email?: string | null;
    isVerified?: boolean;
    category?: string | null;
    igFollowerCount?: number | null;
    igFollowingCount?: number | null;
    igPostCount?: number | null;
    igEngagementRate?: number | null;
    igAvgLikes?: number | null;
    igAvgComments?: number | null;
    igAvgReelViews?: number | null;
    igLast8ReelViews?: number[];
    igAudienceMalePct?: number | null;
    igAudienceFemalePct?: number | null;
    igAudienceTopAgeRange?: string | null;
  } | null>(null);

  async function runLookup() {
    const handle = quickHandle.replace(/^@/, "").trim();
    if (!handle) {
      toast.error("Type an Instagram handle first");
      return;
    }
    setLookupBusy(true);
    setLookupProfile(null);
    try {
      const res = await fetch(`/api/culturex/${encodeURIComponent(handle)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.found === false) {
        toast.error(data?.error || `No profile data found for @${handle}`);
        return;
      }
      setLookupProfile(data);
      // Auto-fill name + email if the user hasn't typed something already.
      if (!quickName && data?.name) setQuickName(data.name);
      if (!quickEmail && data?.email) setQuickEmail(data.email);
      toast.success(
        `Profile loaded${data.source ? ` (source: ${data.source})` : ""}`,
      );
    } catch (e) {
      console.error("[pr-parcels] lookup failed", e);
      toast.error("Lookup failed — check console");
    } finally {
      setLookupBusy(false);
    }
  }

  // Step 2: Products
  const [parcelProducts, setParcelProducts] = useState<ParcelProduct[]>([]);
  const [pendingProductId, setPendingProductId] = useState("");
  const [pendingProductQty, setPendingProductQty] = useState(1);
  const [stockResults, setStockResults] = useState<StockResult[]>([]);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  // Step 3: Shipping
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Load data on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/influencers?limit=500").then((r) => r.json()),
      fetch("/api/products?limit=500").then((r) => r.json()),
    ])
      .then(([influencersData, productsData]) => {
        const influencers = influencersData.influencers || [];
        setInfluencerOptions(
          influencers.map((inf: InfluencerDetail) => ({
            value: inf.id,
            label: inf.name,
            sublabel: [
              inf.instagramHandle ? `@${inf.instagramHandle}` : null,
              inf.tier,
              inf.igFollowerCount ? `${formatCount(inf.igFollowerCount)} followers` : null,
              inf.city,
            ]
              .filter(Boolean)
              .join(" · "),
          }))
        );

        const prods: ProductDetail[] = Array.isArray(productsData)
          ? productsData
          : productsData.items || productsData.products || [];
        setAllProducts(prods);
        setProductOptions(
          prods.map((p) => ({
            value: p.id,
            label: p.name,
            sublabel: [
              p.sku ? `SKU: ${p.sku}` : null,
              p.brand?.name,
              p.category,
              p.mrp != null ? `MRP: ₹${p.mrp}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Fetch influencer details when selected
  async function handleInfluencerSelect(id: string) {
    setSelectedInfluencerId(id);
    if (!id) {
      setSelectedInfluencer(null);
      return;
    }
    setIsLoadingInfluencer(true);
    try {
      const res = await fetch(`/api/influencers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInfluencer(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingInfluencer(false);
    }
  }

  // Add product to parcel
  function addProduct() {
    if (!pendingProductId) return;
    if (parcelProducts.some((p) => p.productId === pendingProductId)) {
      toast.error("Product already added.");
      return;
    }
    const product = allProducts.find((p) => p.id === pendingProductId);
    if (!product) return;

    setParcelProducts((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: pendingProductQty,
        shopifyVariantId: product.shopifyVariantId,
      },
    ]);
    setPendingProductId("");
    setPendingProductQty(1);
    // Clear stock results since product list changed
    setStockResults([]);
  }

  function removeProduct(productId: string) {
    setParcelProducts((prev) => prev.filter((p) => p.productId !== productId));
    setStockResults([]);
  }

  function updateProductQty(productId: string, qty: number) {
    setParcelProducts((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, quantity: qty } : p))
    );
  }

  // Check stock for products with shopifyVariantId. The /api/shopify/stock-
  // check route only implements GET (?productIds=a,b,c). The previous POST
  // version 405'd silently and stockResults stayed empty, so out-of-stock
  // products never blocked submission.
  async function checkStock() {
    const shopifyProducts = parcelProducts.filter((p) => p.shopifyVariantId);
    if (shopifyProducts.length === 0) {
      setStockResults([]);
      toast.info("No Shopify-synced products to check.");
      return;
    }
    setIsCheckingStock(true);
    try {
      const productIds = shopifyProducts
        .map((p) => p.productId)
        .filter(Boolean)
        .join(",");
      const res = await fetch(
        `/api/shopify/stock-check?productIds=${encodeURIComponent(productIds)}`,
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(errBody?.error ?? `Stock check failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setStockResults(data.results ?? []);
      const out = (data.results ?? []).filter(
        (r: StockResult) => !r.inStock,
      ).length;
      if (out > 0) {
        toast.warning(`${out} product(s) out of stock.`);
      } else {
        toast.success("All selected products are in stock.");
      }
    } catch {
      toast.error("Failed to check stock.");
    } finally {
      setIsCheckingStock(false);
    }
  }

  // Validation. Quick-add mode validates against the inline fields directly
  // (we'll create the Influencer record on submit).
  const hasAddress =
    recipientMode === "quick"
      ? !!quickAddress1.trim()
      : !!selectedInfluencer?.addressLine1;
  const hasPhone =
    recipientMode === "quick"
      ? !!quickPhone.trim()
      : !!selectedInfluencer?.phone;
  const recipientPicked =
    recipientMode === "quick"
      ? !!quickName.trim() && !!quickCity.trim() && !!quickPincode.trim()
      : !!selectedInfluencerId && !!selectedInfluencer;
  const canProceed =
    recipientPicked && hasAddress && hasPhone && parcelProducts.length > 0;

  const hasOutOfStock = stockResults.some((r) => !r.inStock);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canProceed) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (hasOutOfStock) {
      toast.error("Some products are out of stock. Please remove them before submitting.");
      return;
    }

    // Auto-detect brand from first product
    const firstProduct = allProducts.find((p) => p.id === parcelProducts[0].productId);
    const brandId = firstProduct?.brandId;

    if (!brandId) {
      toast.error("Could not determine brand from products.");
      return;
    }

    setLoading(true);
    try {
      // Quick-add: create the Influencer row first so the parcel can link to
      // a real ID. The schema requires an FK; we don't want to make it
      // nullable just to support one-off sends.
      let influencerIdForParcel = selectedInfluencerId;
      if (recipientMode === "quick") {
        const cleanHandle = quickHandle.replace(/^@/, "").trim();
        // If the user ran the lookup, include the fetched metrics so the
        // new Influencer row is enriched (not just a hollow placeholder).
        const p = lookupProfile;
        const infRes = await fetch("/api/influencers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: quickName.trim() || p?.name || cleanHandle,
            instagramHandle: cleanHandle || undefined,
            addressLine1: quickAddress1.trim() || undefined,
            addressLine2: quickAddress2.trim() || undefined,
            city: quickCity.trim() || undefined,
            state: quickState.trim() || undefined,
            pincode: quickPincode.trim() || undefined,
            country: "India",
            phone: quickPhone.trim() || undefined,
            email: quickEmail.trim() || p?.email || undefined,
            status: "prospect",
            // Profile metrics from Lookup (only set when present so we don't
            // overwrite anything with nulls).
            ...(p?.bio ? { bio: p.bio } : {}),
            ...(p?.profileImageUrl ? { profileImageUrl: p.profileImageUrl } : {}),
            ...(p?.isVerified ? { isVerified: p.isVerified } : {}),
            ...(p?.category ? { category: p.category } : {}),
            ...(p?.igFollowerCount != null
              ? { igFollowerCount: p.igFollowerCount }
              : {}),
            ...(p?.igFollowingCount != null
              ? { igFollowingCount: p.igFollowingCount }
              : {}),
            ...(p?.igPostCount != null ? { igPostCount: p.igPostCount } : {}),
            ...(p?.igEngagementRate != null
              ? { igEngagementRate: p.igEngagementRate }
              : {}),
            ...(p?.igAvgLikes != null ? { igAvgLikes: p.igAvgLikes } : {}),
            ...(p?.igAvgComments != null
              ? { igAvgComments: p.igAvgComments }
              : {}),
            ...(p?.igAvgReelViews != null
              ? { igAvgReelViews: p.igAvgReelViews }
              : {}),
            ...(p?.igLast8ReelViews?.length
              ? { igLast8ReelViews: p.igLast8ReelViews }
              : {}),
            ...(p?.igAudienceMalePct != null
              ? { igAudienceMalePct: p.igAudienceMalePct }
              : {}),
            ...(p?.igAudienceFemalePct != null
              ? { igAudienceFemalePct: p.igAudienceFemalePct }
              : {}),
            ...(p?.igAudienceTopAgeRange
              ? { igAudienceTopAgeRange: p.igAudienceTopAgeRange }
              : {}),
            ...(p ? { metricsLastSyncedAt: new Date().toISOString() } : {}),
          }),
        });
        const infData = await infRes.json().catch(() => ({}));
        if (!infRes.ok) {
          throw new Error(
            infData?.error ||
              `Failed to create recipient (${infRes.status})`,
          );
        }
        influencerIdForParcel = infData.id || infData?.influencer?.id || "";
        if (!influencerIdForParcel) {
          throw new Error(
            "Recipient created but no ID was returned. Cannot continue.",
          );
        }
        toast.success(`Created recipient: ${quickName}`);
      }

      const res = await fetch("/api/pr-parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId: influencerIdForParcel,
          brandId,
          courierName: courierName || null,
          trackingNumber: trackingNumber || null,
          notes: notes || null,
          items: parcelProducts.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create PR parcel");
      }

      const responseBody = await res.json().catch(() => ({}));
      const shopify = responseBody?._shopify as
        | { attempted: true; success: true; orderName: string }
        | { attempted: true; success: false; error: string }
        | { attempted: false; reason: string }
        | undefined;

      if (shopify?.attempted && shopify.success) {
        toast.success(`PR Parcel created — Shopify order ${shopify.orderName} placed.`);
      } else if (shopify?.attempted && !shopify.success) {
        // Parcel exists in DB but Shopify side failed — surface the exact reason
        // so the user isn't left guessing whether the order went through.
        toast.error(
          `PR Parcel created BUT Shopify order failed: ${shopify.error}`,
          { duration: 10000 },
        );
      } else if (shopify && !shopify.attempted) {
        toast.warning(
          `PR Parcel created. Shopify order skipped — ${shopify.reason}`,
          { duration: 8000 },
        );
      } else {
        toast.success("PR Parcel created!");
      }
      router.push("/pr-parcels");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PR parcel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/pr-parcels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New PR Parcel</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ───── Step 1: Select Influencer ───── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A6192E] text-xs font-bold text-white">
                1
              </span>
              Recipient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle — existing catalog vs. quick-add one-off recipient */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="recipientMode"
                  checked={recipientMode === "existing"}
                  onChange={() => setRecipientMode("existing")}
                />
                <span>From influencer list</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="recipientMode"
                  checked={recipientMode === "quick"}
                  onChange={() => setRecipientMode("quick")}
                />
                <span>Quick-add new (one-off / not in catalog)</span>
              </label>
            </div>

            {recipientMode === "existing" ? (
              <div className="space-y-2">
                <Label>Influencer *</Label>
                <SearchableSelect
                  options={influencerOptions}
                  value={selectedInfluencerId}
                  onChange={handleInfluencerSelect}
                  placeholder="Search influencers..."
                  searchPlaceholder="Type to search..."
                  emptyMessage="No influencers found."
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-amber-50/40 p-4 space-y-3">
                <p className="text-xs text-amber-900">
                  Creating a new minimal influencer record for this PR send.
                  You can fill in the rest later via{" "}
                  <Link
                    href="/influencers"
                    className="font-medium underline"
                  >
                    Influencers
                  </Link>
                  .
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="quickName">Name *</Label>
                    <Input
                      id="quickName"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quickHandle">Instagram handle</Label>
                    <div className="flex gap-2">
                      <Input
                        id="quickHandle"
                        value={quickHandle}
                        onChange={(e) => setQuickHandle(e.target.value)}
                        placeholder="@username"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void runLookup()}
                        disabled={lookupBusy || !quickHandle.trim()}
                        title="Fetch follower count + engagement from CreatorX / Bright Data"
                      >
                        {lookupBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="mr-1 h-4 w-4" />
                            Lookup
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="quickAddress1">Address Line 1 *</Label>
                    <Input
                      id="quickAddress1"
                      value={quickAddress1}
                      onChange={(e) => setQuickAddress1(e.target.value)}
                      placeholder="Building, street"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="quickAddress2">Address Line 2</Label>
                    <Input
                      id="quickAddress2"
                      value={quickAddress2}
                      onChange={(e) => setQuickAddress2(e.target.value)}
                      placeholder="Area, locality (optional)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quickCity">City *</Label>
                    <Input
                      id="quickCity"
                      value={quickCity}
                      onChange={(e) => setQuickCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quickState">State</Label>
                    <Input
                      id="quickState"
                      value={quickState}
                      onChange={(e) => setQuickState(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quickPincode">Pincode *</Label>
                    <Input
                      id="quickPincode"
                      value={quickPincode}
                      onChange={(e) => setQuickPincode(e.target.value)}
                      placeholder="6-digit"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quickPhone">Phone *</Label>
                    <Input
                      id="quickPhone"
                      value={quickPhone}
                      onChange={(e) => setQuickPhone(e.target.value)}
                      placeholder="+91…"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="quickEmail">Email</Label>
                    <Input
                      id="quickEmail"
                      type="email"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                      placeholder="optional"
                    />
                  </div>
                </div>
                {/* Fetched profile preview — shows whatever CreatorX/Bright
                    Data returned. All these fields also get persisted to the
                    new Influencer row on submit. */}
                {lookupProfile && (
                  <div className="rounded-md border bg-white p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {lookupProfile.profileImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lookupProfile.profileImageUrl}
                          alt={lookupProfile.name || "profile"}
                          className="h-12 w-12 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">
                            {lookupProfile.name || `@${quickHandle}`}
                          </span>
                          {lookupProfile.isVerified && (
                            <span className="text-xs text-blue-600">✓ verified</span>
                          )}
                        </div>
                        {lookupProfile.category && (
                          <p className="text-xs text-gray-500 truncate">
                            {lookupProfile.category}
                          </p>
                        )}
                      </div>
                      {lookupProfile.source && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {lookupProfile.source}
                        </span>
                      )}
                    </div>
                    {lookupProfile.bio && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {lookupProfile.bio}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      <Metric
                        label="Followers"
                        value={formatCount(lookupProfile.igFollowerCount)}
                      />
                      <Metric
                        label="Following"
                        value={formatCount(lookupProfile.igFollowingCount)}
                      />
                      <Metric
                        label="Posts"
                        value={formatCount(lookupProfile.igPostCount)}
                      />
                      <Metric
                        label="Engagement"
                        value={
                          lookupProfile.igEngagementRate != null
                            ? `${lookupProfile.igEngagementRate.toFixed(2)}%`
                            : "—"
                        }
                      />
                      <Metric
                        label="Avg Likes"
                        value={formatCount(lookupProfile.igAvgLikes)}
                      />
                      <Metric
                        label="Avg Comments"
                        value={formatCount(lookupProfile.igAvgComments)}
                      />
                      <Metric
                        label="Avg Reel Views"
                        value={formatCount(lookupProfile.igAvgReelViews)}
                      />
                      {lookupProfile.igAudienceTopAgeRange && (
                        <Metric
                          label="Top Age"
                          value={lookupProfile.igAudienceTopAgeRange}
                        />
                      )}
                    </div>
                    {(lookupProfile.igAudienceMalePct != null ||
                      lookupProfile.igAudienceFemalePct != null) && (
                      <div className="text-xs text-gray-600">
                        Audience: ♂{" "}
                        {lookupProfile.igAudienceMalePct?.toFixed(0) ?? "—"}% · ♀{" "}
                        {lookupProfile.igAudienceFemalePct?.toFixed(0) ?? "—"}%
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-xs">
                  {quickAddress1.trim() &&
                  quickCity.trim() &&
                  quickPincode.trim() ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Shipping address ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Address + city + pincode required
                    </span>
                  )}
                  {quickPhone.trim() ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Phone ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Phone required
                    </span>
                  )}
                </div>
              </div>
            )}

            {isLoadingInfluencer && (
              <p className="text-sm text-gray-500">Loading influencer details...</p>
            )}

            {selectedInfluencer && (
              <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                {/* Header — name + handle + tier */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      {selectedInfluencer.name}
                    </p>
                    {selectedInfluencer.instagramHandle && (
                      <a
                        href={`https://instagram.com/${selectedInfluencer.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#A6192E] hover:underline inline-flex items-center gap-1"
                      >
                        @{selectedInfluencer.instagramHandle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedInfluencer.igFollowerCount != null && (
                      <span className="ml-2 text-xs text-gray-500">
                        {formatCount(selectedInfluencer.igFollowerCount)} followers
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedInfluencer.tier && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[selectedInfluencer.tier] || "bg-gray-100 text-gray-700"}`}
                      >
                        {selectedInfluencer.tier}
                      </span>
                    )}
                    <Link
                      href={`/influencers/${selectedInfluencer.id}/edit`}
                      className="text-xs text-gray-600 underline hover:text-gray-900"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* Two-column data grid */}
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Shipping Address */}
                  <div className="rounded-md border bg-white p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Shipping Address
                    </div>
                    {hasAddress ? (
                      <div className="text-sm text-gray-800 whitespace-pre-line">
                        {[
                          selectedInfluencer.addressLine1,
                          selectedInfluencer.addressLine2,
                          [
                            selectedInfluencer.city,
                            selectedInfluencer.state,
                            selectedInfluencer.pincode,
                          ]
                            .filter(Boolean)
                            .join(", "),
                          selectedInfluencer.country,
                        ]
                          .filter(Boolean)
                          .join("\n")}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-700">
                        No address on file —{" "}
                        <Link
                          href={`/influencers/${selectedInfluencer.id}/edit`}
                          className="font-medium underline"
                        >
                          add one
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="rounded-md border bg-white p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Contact
                    </div>
                    <div className="space-y-1 text-sm">
                      {selectedInfluencer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <a
                            href={`tel:${selectedInfluencer.phone}`}
                            className="hover:underline"
                          >
                            {selectedInfluencer.phone}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-yellow-700">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          No phone on file
                        </div>
                      )}
                      {selectedInfluencer.whatsappNumber && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <a
                            href={`https://wa.me/${selectedInfluencer.whatsappNumber.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {selectedInfluencer.whatsappNumber}
                          </a>
                        </div>
                      )}
                      {selectedInfluencer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <a
                            href={`mailto:${selectedInfluencer.email}`}
                            className="hover:underline truncate"
                          >
                            {selectedInfluencer.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment — shown for context (not used for PR parcels, but
                      relevant when this influencer also has a paid collab) */}
                  {(selectedInfluencer.upiId ||
                    selectedInfluencer.bankAccountNumber ||
                    selectedInfluencer.paymentPreference) && (
                    <div className="rounded-md border bg-white p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <CreditCard className="h-3.5 w-3.5" />
                        Payment on file
                      </div>
                      <div className="space-y-1 text-sm">
                        {selectedInfluencer.paymentPreference && (
                          <div className="text-xs text-gray-500">
                            Prefers:{" "}
                            <span className="font-medium text-gray-800 capitalize">
                              {selectedInfluencer.paymentPreference.replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          </div>
                        )}
                        {selectedInfluencer.upiId && (
                          <div>
                            UPI:{" "}
                            <span className="font-mono">
                              {selectedInfluencer.upiId}
                            </span>
                          </div>
                        )}
                        {selectedInfluencer.bankAccountNumber && (
                          <div className="text-xs">
                            Bank: ••••
                            {selectedInfluencer.bankAccountNumber.slice(-4)}
                            {selectedInfluencer.bankIfscCode &&
                              ` · ${selectedInfluencer.bankIfscCode}`}
                          </div>
                        )}
                        {selectedInfluencer.gstin && (
                          <div className="text-xs">
                            GSTIN:{" "}
                            <span className="font-mono">
                              {selectedInfluencer.gstin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Categories / niches */}
                  {((selectedInfluencer.categories?.length ?? 0) > 0 ||
                    (selectedInfluencer.contentNiches?.length ?? 0) > 0) && (
                    <div className="rounded-md border bg-white p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <Tag className="h-3.5 w-3.5" />
                        Niches
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          ...(selectedInfluencer.categories ?? []),
                          ...(selectedInfluencer.contentNiches ?? []),
                        ]
                          .slice(0, 8)
                          .map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                            >
                              {c}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status summary */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {hasAddress ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Address ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Address required
                    </span>
                  )}
                  {hasPhone ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Phone ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Phone required
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ───── Step 2: Select Products ───── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A6192E] text-xs font-bold text-white">
                2
              </span>
              Select Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Product</Label>
                <SearchableSelect
                  options={productOptions}
                  value={pendingProductId}
                  onChange={(v) => setPendingProductId(v)}
                  placeholder="Search products..."
                  searchPlaceholder="Type to search..."
                  emptyMessage="No products found."
                />
              </div>
              <div className="w-20 space-y-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={pendingProductQty}
                  onChange={(e) => setPendingProductQty(parseInt(e.target.value) || 1)}
                />
              </div>
              <Button type="button" variant="outline" onClick={addProduct} disabled={!pendingProductId}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {parcelProducts.length > 0 && (
              <div className="space-y-2">
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium w-20">Qty</th>
                        <th className="px-3 py-2 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelProducts.map((p) => {
                        const stockInfo = stockResults.find((s) => s.productId === p.productId);
                        return (
                          <tr key={p.productId} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span>{p.name}</span>
                              </div>
                              {stockInfo && !stockInfo.inStock && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Out of stock
                                  {stockInfo.quantity != null && ` (available: ${stockInfo.quantity})`}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">
                              {p.sku || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={1}
                                value={p.quantity}
                                onChange={(e) =>
                                  updateProductQty(p.productId, parseInt(e.target.value) || 1)
                                }
                                className="h-8 w-16"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProduct(p.productId)}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Stock check button */}
                {parcelProducts.some((p) => p.shopifyVariantId) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={checkStock}
                    disabled={isCheckingStock}
                  >
                    {isCheckingStock ? "Checking..." : "Check Stock Availability"}
                  </Button>
                )}

                {hasOutOfStock && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                      Some products are out of stock. Remove them or update quantities before submitting.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ───── Step 3: Shipping Details (Optional) ───── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A6192E] text-xs font-bold text-white">
                3
              </span>
              Shipping Details
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courierName">Courier Name</Label>
                <Input
                  id="courierName"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. BlueDart, Delhivery"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* What happens on submit */}
        {parcelProducts.length > 0 &&
          parcelProducts.some((p) => p.shopifyVariantId) && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="font-medium">On submit:</div>
              <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs">
                <li>PR parcel record will be created</li>
                <li>
                  Shopify ₹1 order will be auto-created for the synced products
                  (uses the address shown above)
                </li>
                <li>Tracking info can be added later</li>
              </ul>
            </div>
          )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !canProceed || hasOutOfStock}
            className="bg-[#A6192E] hover:bg-[#8a1526] text-white"
          >
            {loading ? "Creating..." : "Create PR Parcel"}
          </Button>
          <Link href="/pr-parcels">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-50 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-gray-900">{value || "—"}</div>
    </div>
  );
}
