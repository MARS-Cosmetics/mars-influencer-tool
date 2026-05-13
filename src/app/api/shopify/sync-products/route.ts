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
    console.log(`[Shopify] sync-products: fetched ${shopifyProducts.length} products from Shopify`);

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsFailed = 0;
    const inventoryItemIds: number[] = [];

    // Flatten to a list of variant upserts so we can run them in parallel
    // batches — sequential awaits across thousands of variants is the main
    // reason sync used to "just keep loading."
    type UpsertJob = { variantIdStr: string; data: Parameters<typeof prisma.product.upsert>[0]["update"]; inventoryItemId: number | null };
    const jobs: UpsertJob[] = [];
    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        const imageSrc = product.image?.src ?? product.images?.[0]?.src ?? null;
        const variantIdStr = String(variant.id);
        jobs.push({
          variantIdStr,
          data: {
            name: product.title,
            sku: variant.sku || null,
            mrp: variant.price ? parseFloat(variant.price) : undefined,
            category: product.product_type || undefined,
            shopifyImageUrl: imageSrc,
            imageUrl: imageSrc,
            isActive: product.status === "active",
            shopifyProductId: String(product.id),
            shopifyInventoryItemId: variant.inventory_item_id ? String(variant.inventory_item_id) : null,
            inventoryQuantity: variant.inventory_quantity,
            shopifyLastSyncAt: new Date(),
            brandId: brand.id,
          },
          inventoryItemId: variant.inventory_item_id || null,
        });
      }
    }

    const BATCH = 20;
    for (let i = 0; i < jobs.length; i += BATCH) {
      const slice = jobs.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map((job) =>
          prisma.product.upsert({
            where: { shopifyVariantId: job.variantIdStr },
            update: job.data,
            create: { ...job.data, shopifyVariantId: job.variantIdStr } as Parameters<typeof prisma.product.upsert>[0]["create"],
          })
        )
      );
      for (let k = 0; k < results.length; k++) {
        const r = results[k];
        const job = slice[k];
        if (r.status === "rejected") {
          itemsFailed++;
          console.error(`[Shopify] upsert failed for variant ${job.variantIdStr}:`, r.reason);
          continue;
        }
        if (r.value.createdAt.getTime() === r.value.updatedAt.getTime()) itemsCreated++;
        else itemsUpdated++;
        if (job.inventoryItemId) inventoryItemIds.push(job.inventoryItemId);
      }
      console.log(`[Shopify] sync-products: upserted ${Math.min(i + BATCH, jobs.length)}/${jobs.length}`);
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
        itemsFailed,
      },
    });

    return NextResponse.json({
      success: true,
      syncLogId: syncLog.id,
      totalProducts: shopifyProducts.length,
      itemsCreated,
      itemsUpdated,
      itemsFailed,
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
