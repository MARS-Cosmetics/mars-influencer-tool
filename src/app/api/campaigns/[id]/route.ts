import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: true,
        collaborations: {
          include: {
            influencer: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Failed to fetch campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const previous = await prisma.campaign.findUnique({
      where: { id },
      select: { status: true, totalBudget: true, name: true },
    });

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name,
        brandId: body.brandId,
        description: body.description,
        status: body.status,
        totalBudget: body.totalBudget ? parseFloat(body.totalBudget) : undefined,
        currency: body.currency,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        goals: body.goals,
      },
      include: { brand: true },
    });

    const trackFields = ["status", "totalBudget", "name"];
    for (const field of trackFields) {
      const oldVal = String((previous as any)?.[field] ?? "");
      const newVal = String((campaign as any)[field] ?? "");
      if (oldVal !== newVal) {
        await prisma.activityLog.create({
          data: {
            entityType: "campaign",
            entityId: id,
            action: field === "status" ? "status_change" : field === "totalBudget" ? "field_update" : "field_update",
            field,
            oldValue: oldVal,
            newValue: newVal,
            description: `${field} updated`,
          },
        });
      }
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Failed to update campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.campaign.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        entityType: "campaign",
        entityId: id,
        action: "deleted",
        description: `Campaign deleted/deactivated`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
