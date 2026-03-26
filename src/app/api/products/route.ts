import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const brandId = searchParams.get("brandId") || "";
    const category = searchParams.get("category") || "";

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

    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const products = await prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// Products are read-only — managed via Shopify sync
// No manual product creation allowed
export async function POST() {
  return NextResponse.json(
    { error: "Products are managed via Shopify sync. Use Shopify Integration > Sync Now to add products." },
    { status: 403 }
  );
}
