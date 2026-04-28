"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle2, Package, ExternalLink } from "lucide-react";
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
  addressLine1?: string;
  addressLine2?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
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

  // Step 1: Influencer
  const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerDetail | null>(null);
  const [isLoadingInfluencer, setIsLoadingInfluencer] = useState(false);

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

  // Check stock for products with shopifyVariantId
  async function checkStock() {
    const shopifyProducts = parcelProducts.filter((p) => p.shopifyVariantId);
    if (shopifyProducts.length === 0) {
      setStockResults([]);
      return;
    }
    setIsCheckingStock(true);
    try {
      const res = await fetch("/api/shopify/stock-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: shopifyProducts.map((p) => ({
            productId: p.productId,
            variantId: p.shopifyVariantId,
            quantity: p.quantity,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStockResults(data.results || []);
      }
    } catch {
      toast.error("Failed to check stock.");
    } finally {
      setIsCheckingStock(false);
    }
  }

  // Validation
  const hasAddress = !!selectedInfluencer?.addressLine1;
  const hasPhone = !!selectedInfluencer?.phone;
  const canProceed =
    selectedInfluencerId &&
    selectedInfluencer &&
    hasAddress &&
    hasPhone &&
    parcelProducts.length > 0;

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
      const res = await fetch("/api/pr-parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId: selectedInfluencerId,
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

      toast.success("PR Parcel created!");
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
              Select Influencer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {isLoadingInfluencer && (
              <p className="text-sm text-gray-500">Loading influencer details...</p>
            )}

            {selectedInfluencer && (
              <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedInfluencer.name}</p>
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
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedInfluencer.tier && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[selectedInfluencer.tier] || "bg-gray-100 text-gray-700"}`}
                      >
                        {selectedInfluencer.tier}
                      </span>
                    )}
                    {selectedInfluencer.city && (
                      <span className="text-xs text-gray-500">{selectedInfluencer.city}</span>
                    )}
                  </div>
                </div>

                {/* Address check */}
                {!hasAddress && (
                  <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      No address on file.{" "}
                      <Link
                        href={`/influencers/${selectedInfluencer.id}`}
                        className="font-medium underline"
                      >
                        Edit influencer
                      </Link>
                    </p>
                  </div>
                )}
                {hasAddress && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Address available
                  </div>
                )}

                {/* Phone check */}
                {!hasPhone && (
                  <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      No phone number on file.{" "}
                      <Link
                        href={`/influencers/${selectedInfluencer.id}`}
                        className="font-medium underline"
                      >
                        Edit influencer
                      </Link>
                    </p>
                  </div>
                )}
                {hasPhone && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Phone number available
                  </div>
                )}
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
