import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const month = searchParams.get("month"); // YYYY-MM format

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, m] = month.split("-").map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59);
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Find all collaboration products created this month where the same product was sent to the same influencer before
    const collaborationProducts = await prisma.collaborationProduct.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        collaboration: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            influencerId: true,
            influencer: { select: { name: true, instagramHandle: true } },
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each, check if there's a previous occurrence
    const duplicates = [];
    for (const cp of collaborationProducts) {
      const previousCount = await prisma.collaborationProduct.count({
        where: {
          productId: cp.product.id,
          collaboration: { influencerId: cp.collaboration.influencerId },
          createdAt: { lt: cp.createdAt },
        },
      });

      const previousPrCount = await prisma.prParcelItem.count({
        where: {
          productId: cp.product.id,
          prParcel: { influencerId: cp.collaboration.influencerId },
          createdAt: { lt: cp.createdAt },
        },
      });

      if (previousCount > 0 || previousPrCount > 0) {
        duplicates.push({
          collaborationId: cp.collaboration.id,
          influencer: cp.collaboration.influencer.name,
          instagramHandle: cp.collaboration.influencer.instagramHandle,
          productName: cp.product.name,
          productSku: cp.product.sku,
          brand: cp.collaboration.brand.name,
          collaborationType: cp.collaboration.type,
          date: cp.createdAt,
          previousCollabOccurrences: previousCount,
          previousPrOccurrences: previousPrCount,
          totalPreviousOccurrences: previousCount + previousPrCount,
        });
      }
    }

    return NextResponse.json({
      period: month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalDuplicates: duplicates.length,
      duplicates,
    });
  } catch (error) {
    console.error("Duplicate report failed:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
