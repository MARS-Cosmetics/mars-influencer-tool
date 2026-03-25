import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USE_MOCK } from "@/lib/shopify";

export async function GET() {
  try {
    // Get the latest sync log for each sync type
    const syncTypes = ["products", "inventory", "tracking"];

    const latestSyncs = await Promise.all(
      syncTypes.map(async (syncType) => {
        const log = await prisma.syncLog.findFirst({
          where: { syncType },
          orderBy: { startedAt: "desc" },
        });
        return { syncType, log };
      })
    );

    // Count total synced products (those with a shopifyProductId)
    const totalProductsSynced = await prisma.product.count({
      where: { shopifyProductId: { not: null } },
    });

    // Count tracked orders (collaborations with a shopifyOrderId)
    const totalOrdersTracked = await prisma.collaboration.count({
      where: { shopifyOrderId: { not: null } },
    });

    const syncStatus = Object.fromEntries(
      latestSyncs.map(({ syncType, log }) => [syncType, log])
    );

    return NextResponse.json({
      connected: !USE_MOCK,
      mockMode: USE_MOCK,
      shopifyConnected: !USE_MOCK,
      usingMockData: USE_MOCK,
      totalProductsSynced,
      totalOrdersTracked,
      latestSyncs: syncStatus,
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
