import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const productIds = searchParams.get("productIds");

    if (!productIds) {
      return NextResponse.json({ error: "productIds parameter is required" }, { status: 400 });
    }

    const ids = productIds.split(",").map((id) => id.trim());

    // Fetch products with their synced inventory data
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        sku: true,
        shopifyProductId: true,
        inventoryQuantity: true,
        isActive: true,
      },
    });

    const stockResults = products.map((product) => {
      const quantity = product.inventoryQuantity ?? 0;
      const inStock = quantity > 0;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        shopifyProductId: product.shopifyProductId,
        isActive: product.isActive,
        inStock,
        quantity,
        discontinued: !product.isActive,
      };
    });

    const outOfStock = stockResults.filter((r) => !r.inStock);

    return NextResponse.json({
      results: stockResults,
      totalChecked: stockResults.length,
      inStockCount: stockResults.filter((r) => r.inStock).length,
      outOfStockCount: outOfStock.length,
      outOfStockProducts: outOfStock,
    });
  } catch (error) {
    console.error("Stock check failed:", error);
    return NextResponse.json({ error: "Stock check failed" }, { status: 500 });
  }
}
