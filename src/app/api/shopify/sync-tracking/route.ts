import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchOrdersByIds } from "@/lib/shopify";

export async function POST() {
  const syncLog = await prisma.syncLog.create({
    data: { syncType: "tracking", status: "running" },
  });

  try {
    // Find all collaborations with a Shopify order that are not yet fulfilled
    const collaborations = await prisma.collaboration.findMany({
      where: {
        shopifyOrderId: { not: null },
        OR: [
          { shopifyFulfillmentStatus: null },
          { shopifyFulfillmentStatus: { not: "fulfilled" } },
        ],
      },
    });

    if (collaborations.length === 0) {
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
        message: "No pending orders to sync",
        itemsProcessed: 0,
        itemsUpdated: 0,
      });
    }

    const orderIds = collaborations
      .map((c) => c.shopifyOrderId!)
      .filter(Boolean);

    const orders = await fetchOrdersByIds(orderIds);

    // Build a map for quick lookup
    const orderMap = new Map(orders.map((o) => [String(o.id), o]));

    let itemsUpdated = 0;

    for (const collab of collaborations) {
      const order = orderMap.get(collab.shopifyOrderId!);
      if (!order) continue;

      const fulfillment = order.fulfillments?.[0];

      await prisma.collaboration.update({
        where: { id: collab.id },
        data: {
          shopifyOrderStatus: order.fulfillment_status || "unfulfilled",
          shopifyFulfillmentStatus: order.fulfillment_status,
          shopifyTrackingId: fulfillment?.tracking_number ?? collab.shopifyTrackingId,
          shopifyTrackingUrl: fulfillment?.tracking_url ?? collab.shopifyTrackingUrl,
          shopifyLastSyncAt: new Date(),
        },
      });

      itemsUpdated++;
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        itemsProcessed: collaborations.length,
        itemsUpdated,
        itemsFailed: 0,
      },
    });

    return NextResponse.json({
      success: true,
      syncLogId: syncLog.id,
      itemsProcessed: collaborations.length,
      itemsUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking sync failed:", error);

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
