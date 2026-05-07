import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
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

    // Treat empty/null as "clear this field" rather than "leave unchanged".
    // Required fields (name, brandId, status, currency) keep their existing
    // values if blank by being skipped from the update.
    const data: Prisma.CampaignUpdateInput = {};
    if (body.name) data.name = body.name;
    if (body.status) data.status = body.status;
    if (body.currency) data.currency = body.currency;
    if (body.brandId) data.brand = { connect: { id: body.brandId } };
    if ("description" in body) data.description = body.description || null;
    if ("totalBudget" in body) {
      data.totalBudget = body.totalBudget ? parseFloat(body.totalBudget) : null;
    }
    if ("startDate" in body) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if ("endDate" in body) {
      data.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if ("goals" in body) data.goals = body.goals ?? Prisma.DbNull;

    const campaign = await prisma.campaign.update({
      where: { id },
      data,
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
    let message = "Failed to update campaign";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError
    ) {
      message = error.message.split("\n").pop()?.trim() || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
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
