import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logFieldDiffs, logDelete } from "@/lib/activity-log";

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

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    void logFieldDiffs(
      userId,
      "campaign",
      id,
      previous as Record<string, unknown> | null,
      campaign as unknown as Record<string, unknown>,
      ["status", "totalBudget", "name"],
    );

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
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const { id } = await params;
    const before = await prisma.campaign.findUnique({ where: { id }, select: { name: true } });
    await prisma.campaign.delete({ where: { id } });

    void logDelete(userId, "campaign", id, `Deleted campaign: ${before?.name ?? id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
