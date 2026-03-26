export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";
import { RefreshCw, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; brandId?: string; category?: string }>;
}) {
  const { search, brandId, category } = await searchParams;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (brandId) {
    where.brandId = brandId;
  }

  if (category) {
    where.category = category;
  }

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);

  const uniqueCategories = categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Product catalog synced from Shopify. Manage products in your Shopify store.
          </p>
        </div>
        <Link href="/settings/shopify">
          <Button variant="outline">
            <RefreshCw className="mr-1 h-4 w-4" />
            Sync from Shopify
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <form className="flex items-center gap-4 flex-1">
          <Input
            name="search"
            placeholder="Search by name or SKU..."
            defaultValue={search || ""}
            className="max-w-sm"
          />
          <select
            name="brandId"
            defaultValue={brandId || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={category || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>MRP</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {product.sku || "-"}
                  </TableCell>
                  <TableCell>{product.brand.name}</TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>{formatCurrency(product.mrp)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
