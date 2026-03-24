"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brandId: string;
  brand?: { name: string };
  category?: string;
  mrp?: number;
}

interface ParcelItem {
  productId: string;
  quantity: number;
}

export default function NewPrParcelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [influencerOptions, setInfluencerOptions] = useState<SearchableSelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SearchableSelectOption[]>([]);
  const [collaborationOptions, setCollaborationOptions] = useState<SearchableSelectOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<SearchableSelectOption[]>([]);

  const [form, setForm] = useState({
    influencerId: "",
    brandId: "",
    collaborationId: "",
    shippingAddress: "",
    courierName: "",
    trackingNumber: "",
  });

  const [items, setItems] = useState<ParcelItem[]>([
    { productId: "", quantity: 1 },
  ]);

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/influencers?limit=500").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/collaborations").then((r) => r.json()),
    ])
      .then(([influencersData, brandsData, productsData, collabsData]) => {
        const influencers = influencersData.influencers || [];
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

        const brands = Array.isArray(brandsData) ? brandsData : brandsData.brands || [];
        setBrandOptions(
          brands.map((b: { id: string; name: string }) => ({
            value: b.id,
            label: b.name,
          }))
        );

        const prods: Product[] = Array.isArray(productsData) ? productsData : productsData.products || [];
        setProducts(prods);

        const collabs = Array.isArray(collabsData) ? collabsData : collabsData.collaborations || [];
        setCollaborationOptions(
          collabs.map((c: { id: string; type: string; influencer?: { name: string }; brand?: { name: string } }) => ({
            value: c.id,
            label: `${c.type}${c.brand ? ` - ${c.brand.name}` : ""}`,
            sublabel: c.influencer?.name,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Update product options when brand changes
  useEffect(() => {
    const filtered = form.brandId
      ? products.filter((p) => p.brandId === form.brandId)
      : products;
    setProductOptions(
      filtered.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: [
          p.sku ? `SKU: ${p.sku}` : null,
          p.brand?.name,
          p.category,
          p.mrp != null ? `MRP: ${p.mrp}` : null,
        ].filter(Boolean).join(" · "),
      }))
    );
  }, [products, form.brandId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleItemChange(
    index: number,
    field: keyof ParcelItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.influencerId || !form.brandId) {
      toast.error("Influencer and Brand are required.");
      return;
    }

    const validItems = items.filter((item) => item.productId);
    if (validItems.length === 0) {
      toast.error("Please add at least one product.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pr-parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          collaborationId: form.collaborationId || null,
          items: validItems,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create PR parcel");
      }

      toast.success("PR Parcel created successfully!");
      router.push("/pr-parcels");
    } catch {
      toast.error("Failed to create PR parcel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pr-parcels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New PR Parcel</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parcel Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="influencerId">Influencer *</Label>
                <SearchableSelect
                  options={influencerOptions}
                  value={form.influencerId}
                  onChange={(value) => setField("influencerId", value)}
                  placeholder="Select Influencer"
                  searchPlaceholder="Search influencers..."
                  emptyMessage="No influencers found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand *</Label>
                <SearchableSelect
                  options={brandOptions}
                  value={form.brandId}
                  onChange={(value) => setField("brandId", value)}
                  placeholder="Select Brand"
                  searchPlaceholder="Search brands..."
                  emptyMessage="No brands found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaborationId">Collaboration (Optional)</Label>
                <SearchableSelect
                  options={collaborationOptions}
                  value={form.collaborationId}
                  onChange={(value) => setField("collaborationId", value)}
                  placeholder="None"
                  searchPlaceholder="Search collaborations..."
                  emptyMessage="No collaborations found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courierName">Courier Name</Label>
                <Input
                  id="courierName"
                  name="courierName"
                  value={form.courierName}
                  onChange={handleChange}
                  placeholder="e.g. BlueDart, Delhivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  name="trackingNumber"
                  value={form.trackingNumber}
                  onChange={handleChange}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingAddress">Shipping Address</Label>
              <Textarea
                id="shippingAddress"
                name="shippingAddress"
                value={form.shippingAddress}
                onChange={handleChange}
                placeholder="Enter full shipping address"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Product
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Product</Label>
                    <SearchableSelect
                      options={productOptions}
                      value={item.productId}
                      onChange={(value) => handleItemChange(index, "productId", value)}
                      placeholder="Select Product"
                      searchPlaceholder="Search products..."
                      emptyMessage="No products found."
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Parcel"}
              </Button>
              <Link href="/pr-parcels">
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
