import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USE_MOCK } from "@/lib/shopify";

export async function GET() {
  try {
    // Get the latest sync log for each sync type
    const [productsLog, inventoryLog, trackingLog] = await Promise.all([
      prisma.syncLog.findFirst({
        where: { syncType: "products" },
        orderBy: { startedAt: "desc" },
      }),
      prisma.syncLog.findFirst({
        where: { syncType: "inventory" },
        orderBy: { startedAt: "desc" },
      }),
      prisma.syncLog.findFirst({
        where: { syncType: "tracking" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    // Count total synced products
    const totalProductsSynced = await prisma.product.count({
      where: { shopifyProductId: { not: null } },
    });

    // Count tracked orders
    const totalOrdersTracked = await prisma.collaboration.count({
      where: { shopifyOrderId: { not: null } },
    });

    // Get recent sync history (last 10 entries)
    const recentLogs = await prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    const history = recentLogs.map((log) => {
      const duration =
        log.completedAt && log.startedAt
          ? `${Math.round((log.completedAt.getTime() - log.startedAt.getTime()) / 1000)}s`
          : null;

      return {
        id: log.id,
        type: log.syncType,
        status: log.status,
        startedAt: log.startedAt.toISOString(),
        duration,
        itemsProcessed: log.itemsProcessed ?? 0,
        itemsCreated: log.itemsCreated ?? 0,
        itemsUpdated: log.itemsUpdated ?? 0,
        itemsFailed: log.itemsFailed ?? 0,
        triggeredBy: log.triggeredBy ?? "manual",
      };
    });

    return NextResponse.json({
      connected: !USE_MOCK,
      mockMode: USE_MOCK,
      shopifyConnected: !USE_MOCK,
      usingMockData: USE_MOCK,
      totalProductsSynced,
      totalOrdersTracked,
      // Shape the UI expects
      products: {
        lastSynced: productsLog?.completedAt?.toISOString() ?? null,
        count: totalProductsSynced,
      },
      orders: {
        lastSynced: trackingLog?.completedAt?.toISOString() ?? null,
        count: totalOrdersTracked,
      },
      inventory: {
        lastSynced: inventoryLog?.completedAt?.toISOString() ?? null,
      },
      history,
      // Raw sync logs for backward compat
      latestSyncs: {
        products: productsLog,
        inventory: inventoryLog,
        tracking: trackingLog,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync status check failed:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
