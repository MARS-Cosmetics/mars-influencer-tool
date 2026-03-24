import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchInventoryLevels } from "@/lib/shopify";

export async function POST() {
  const syncLog = await prisma.syncLog.create({
    data: { syncType: "inventory", status: "running" },
  });

  try {
    // Find all products with a Shopify inventory item ID
    const products = await prisma.product.findMany({
      where: { shopifyInventoryItemId: { not: null } },
      select: {
        id: true,
        shopifyInventoryItemId: true,
      },
    });

    if (products.length === 0) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          itemsProcessed: 0,
          itemsUpdated: 0,
        },
      });

      return NextResponse.json({
        success: true,
        syncLogId: syncLog.id,
        message: "No products with Shopify inventory item IDs found",
        itemsProcessed: 0,
        itemsUpdated: 0,
      });
    }

    const inventoryItemIds = products.map((p) =>
      parseInt(p.shopifyInventoryItemId!, 10)
    );

    const levels = await fetchInventoryLevels(inventoryItemIds);

    // Build a map for quick lookup
    const levelMap = new Map(
      levels.map((l) => [String(l.inventory_item_id), l.available])
    );

    let itemsUpdated = 0;

    for (const product of products) {
      const available = levelMap.get(product.shopifyInventoryItemId!);
      if (available !== undefined) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            inventoryQuantity: available,
            shopifyLastSyncAt: new Date(),
          },
        });
        itemsUpdated++;
      }
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        itemsProcessed: products.length,
        itemsUpdated,
        itemsFailed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      syncLogId: syncLog.id,
      itemsProcessed: products.length,
      itemsUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Inventory sync failed:", error);

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
