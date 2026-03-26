import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const contentIdea = await prisma.contentIdea.findUnique({
      where: { id },
      include: {
        brand: true,
        campaign: true,
        collaboration: {
          include: {
            influencer: { select: { id: true, name: true } },
          },
        },
        influencer: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!contentIdea) {
      return NextResponse.json(
        { error: "Content idea not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contentIdea);
  } catch (error) {
    console.error("Failed to fetch content idea:", error);
    return NextResponse.json(
      { error: "Failed to fetch content idea" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    // Convert date strings to Date objects
    if (body.targetDate) {
      body.targetDate = new Date(body.targetDate);
    } else if (body.targetDate === "") {
      body.targetDate = null;
    }

    // Handle referenceUrls - split by newline if string
    if (typeof body.referenceUrls === "string") {
      body.referenceUrls = body.referenceUrls
        .split("\n")
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);
    }

    // Handle nullable foreign keys
    const nullableFields = ["brandId", "campaignId", "collaborationId", "influencerId"];
    for (const field of nullableFields) {
      if (body[field] === "") {
        body[field] = null;
      }
    }

    const previous = await prisma.contentIdea.findUnique({
      where: { id },
      select: { status: true, priority: true, title: true },
    });

    const contentIdea = await prisma.contentIdea.update({
      where: { id },
      data: body,
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        influencer: { select: { id: true, name: true } },
      },
    });

    const trackFields = ["status", "priority", "title"];
    for (const field of trackFields) {
      const oldVal = String((previous as any)?.[field] ?? "");
      const newVal = String((contentIdea as any)[field] ?? "");
      if (oldVal !== newVal) {
        await prisma.activityLog.create({
          data: {
            entityType: "content_idea",
            entityId: id,
            action: field === "status" ? "status_change" : field === "priority" ? "status_change" : "field_update",
            field,
            oldValue: oldVal,
            newValue: newVal,
            description: `${field} updated`,
          },
        });
      }
    }

    return NextResponse.json(contentIdea);
  } catch (error) {
    console.error("Failed to update content idea:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update content idea";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    await prisma.contentIdea.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "content_idea",
        entityId: id,
        action: "deleted",
        description: `Content idea deleted/deactivated`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete content idea:", error);
    return NextResponse.json(
      { error: "Failed to delete content idea" },
      { status: 500 }
    );
  }
}
