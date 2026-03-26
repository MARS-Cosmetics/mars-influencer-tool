import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        collaborations: {
          include: {
            brand: { select: { name: true } },
            campaign: { select: { name: true } },
            agency: { select: { name: true, commissionPct: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        agency: { select: { id: true, name: true, commissionPct: true, contactPerson: true } },
        prParcels: {
          include: {
            brand: { select: { name: true } },
            items: {
              include: { product: { select: { name: true, sku: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        assets: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          include: {
            collaboration: {
              select: {
                brand: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: "Influencer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(influencer);
  } catch (error) {
    console.error("Failed to fetch influencer:", error);
    return NextResponse.json(
      { error: "Failed to fetch influencer" },
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

    // Handle comma-separated arrays
    const arrayFields = ["categories", "contentNiches", "languages", "tags"];
    for (const field of arrayFields) {
      if (typeof body[field] === "string") {
        body[field] = body[field]
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    // Convert numeric strings to numbers
    const intFields = [
      "igFollowerCount",
      "igFollowingCount",
      "igPostCount",
      "igAvgLikes",
      "igAvgComments",
      "igAvgReelViews",
      "igAvgStoryViews",
      "igMedianReelViews",
      "ytSubscriberCount",
      "ytTotalViews",
      "ytAvgViews",
      "ytMedianVideoViews",
      "pastCollabCount",
    ];
    for (const field of intFields) {
      if (body[field] !== undefined && body[field] !== "") {
        body[field] = parseInt(body[field], 10);
      } else if (body[field] === "") {
        body[field] = null;
      }
    }

    // Convert decimal strings
    const decimalFields = [
      "igEngagementRate",
      "socialScore",
      "brandAffinityScore",
      "contentQualityScore",
      "reliabilityScore",
      "igAudienceMalePct",
      "igAudienceFemalePct",
      "igCredibilityScore",
      "ytEngagementRate",
      "ytAudienceMalePct",
      "ytAudienceFemalePct",
      "rateInstagramReel",
      "rateInstagramStory",
      "rateInstagramPost",
      "rateYoutubeVideo",
      "rateYoutubeShort",
      "rateBlogPost",
      "rateTwitterPost",
    ];
    for (const field of decimalFields) {
      if (body[field] !== undefined && body[field] !== "") {
        body[field] = parseFloat(body[field]);
      } else if (body[field] === "") {
        body[field] = null;
      }
    }

    // Handle dateOfBirth
    if (body.dateOfBirth) {
      body.dateOfBirth = new Date(body.dateOfBirth);
    } else if (body.dateOfBirth === "") {
      body.dateOfBirth = null;
    }

    const previous = await prisma.influencer.findUnique({
      where: { id },
      select: { name: true, email: true, instagramHandle: true, tier: true, status: true },
    });

    const influencer = await prisma.influencer.update({
      where: { id },
      data: body,
    });

    const trackFields = ["name", "email", "instagramHandle", "tier", "status"];
    for (const field of trackFields) {
      const oldVal = String((previous as any)?.[field] ?? "");
      const newVal = String((influencer as any)[field] ?? "");
      if (oldVal !== newVal) {
        await prisma.activityLog.create({
          data: {
            entityType: "influencer",
            entityId: id,
            action: field === "status" ? "status_change" : field === "tier" ? "status_change" : "field_update",
            field,
            oldValue: oldVal,
            newValue: newVal,
            description: `${field} updated`,
          },
        });
      }
    }

    return NextResponse.json(influencer);
  } catch (error) {
    console.error("Failed to update influencer:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update influencer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.influencer.update({
      where: { id },
      data: { status: "inactive" },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "influencer",
        entityId: id,
        action: "deleted",
        description: `Influencer deleted/deactivated`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete influencer:", error);
    return NextResponse.json(
      { error: "Failed to delete influencer" },
      { status: 500 }
    );
  }
}
