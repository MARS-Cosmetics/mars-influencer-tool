import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchAllProducts,
  fetchInventoryLevels,
} from "@/lib/shopify";

export async function POST() {
  const syncLog = await prisma.syncLog.create({
    data: { syncType: "products", status: "running" },
  });

  try {
    // Resolve or create default brand
    let brand = await prisma.brand.findFirst({ orderBy: { createdAt: "asc" } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: "MARS Cosmetics", slug: "mars-cosmetics" },
      });
    }

    const shopifyProducts = await fetchAllProducts();

    let itemsCreated = 0;
    let itemsUpdated = 0;
    const inventoryItemIds: number[] = [];

    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        const imageSrc = product.image?.src ?? product.images?.[0]?.src ?? null;

        const existing = await prisma.product.findFirst({
          where: { shopifyVariantId: String(variant.id) },
        });

        const data = {
          name: product.title,
          sku: variant.sku ?? undefined,
          mrp: variant.price ? parseFloat(variant.price) : undefined,
          category: product.product_type || undefined,
          shopifyImageUrl: imageSrc,
          imageUrl: imageSrc,
          isActive: product.status === "active",
          shopifyProductId: String(product.id),
          shopifyVariantId: String(variant.id),
          shopifyInventoryItemId: String(variant.inventory_item_id),
          inventoryQuantity: variant.inventory_quantity,
          shopifyLastSyncAt: new Date(),
          brandId: brand.id,
        };

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data,
          });
          itemsUpdated++;
        } else {
          await prisma.product.create({ data });
          itemsCreated++;
        }

        if (variant.inventory_item_id) {
          inventoryItemIds.push(variant.inventory_item_id);
        }
      }
    }

    // Fetch and update inventory levels
    if (inventoryItemIds.length > 0) {
      const levels = await fetchInventoryLevels(inventoryItemIds);

      for (const level of levels) {
        await prisma.product.updateMany({
          where: { shopifyInventoryItemId: String(level.inventory_item_id) },
          data: { inventoryQuantity: level.available },
        });
      }
    }

    const totalProcessed = itemsCreated + itemsUpdated;

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        itemsProcessed: totalProcessed,
        itemsCreated,
        itemsUpdated,
        itemsFailed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      syncLogId: syncLog.id,
      totalProducts: shopifyProducts.length,
      itemsCreated,
      itemsUpdated,
      totalProcessed,
      inventoryItemsSynced: inventoryItemIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Product sync failed:", error);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: message,
      },
    });

    return NextResponse.json(
      { success: false, error: message, syncLogId: syncLog.id },
      { status: 500 }
    );
  }
}
