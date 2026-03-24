import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        influencer: { select: { id: true, name: true, instagramHandle: true } },
        brand: { select: { id: true, name: true } },
        collaboration: { select: { id: true, type: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error("Failed to fetch contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Convert numeric strings
    if (body.contractValue !== undefined && body.contractValue !== "") {
      body.contractValue = parseFloat(body.contractValue);
    } else if (body.contractValue === "") {
      body.contractValue = null;
    }

    if (body.expiryAlertDays !== undefined && body.expiryAlertDays !== "") {
      body.expiryAlertDays = parseInt(body.expiryAlertDays, 10);
    } else if (body.expiryAlertDays === "") {
      body.expiryAlertDays = null;
    }

    // Handle dates
    if (body.startDate) {
      body.startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      body.endDate = new Date(body.endDate);
    }

    // Handle boolean
    if (typeof body.autoRenew === "string") {
      body.autoRenew = body.autoRenew === "true";
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error("Failed to update contract:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.contract.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
