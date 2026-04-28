"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { RefreshCw, ShoppingBag, Loader2 } from "lucide-react";
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
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  mrp: number | string | null;
  isActive: boolean;
  brand: { id: string; name: string };
};

type ProductsResponse = {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
};

type Brand = { id: string; name: string };

const PAGE_SIZE = 50;

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function ProductsPage() {
  // Filter state (input fields)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;

  // Build the URL — SWR uses this string as the cache key.
  // Visiting page 2 then page 1 = different keys, page 1 served from cache.
  const productsUrl = `/api/products?limit=${PAGE_SIZE}&offset=${offset}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${brandId ? `&brandId=${encodeURIComponent(brandId)}` : ""}${
    category ? `&category=${encodeURIComponent(category)}` : ""
  }`;

  const { data, isLoading, error } = useSWR<ProductsResponse>(
    productsUrl,
    fetcher,
    {
      keepPreviousData: true, // show old page while new one loads
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  // Filter dropdowns — fetched once, cached forever (until refresh)
  const { data: brandData } = useSWR<{ brands: Brand[] }>(
    "/api/brands",
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );
  const { data: categoryData } = useSWR<{ categories: string[] }>(
    "/api/products/categories",
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const brands = brandData?.brands ?? [];
  const categories = categoryData?.categories ?? [];
  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setBrandId("");
    setCategory("");
    setPage(1);
  };

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

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-3"
      >
        <Input
          placeholder="Search by name or SKU..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setPage(1);
          }}
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
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(search || brandId || category) && (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        )}
      </form>

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
            {error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-red-500 py-8"
                >
                  Failed to load products. Try refreshing.
                </TableCell>
              </TableRow>
            ) : isLoading && !data ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-gray-500 py-8"
                >
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isLoading && data && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </>
          )}
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
