import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const tier = searchParams.get("tier") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.InfluencerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { instagramHandle: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tier) {
      where.tier = tier as Prisma.InfluencerWhereInput["tier"];
    }

    if (status) {
      where.status = status as Prisma.InfluencerWhereInput["status"];
    }

    const [influencers, total] = await Promise.all([
      prisma.influencer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          instagramHandle: true,
          tier: true,
          igFollowerCount: true,
          igEngagementRate: true,
          socialScore: true,
          status: true,
          city: true,
          profileImageUrl: true,
          categories: true,
          createdAt: true,
        },
      }),
      prisma.influencer.count({ where }),
    ]);

    return NextResponse.json({ influencers, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch influencers:", error);
    return NextResponse.json(
      { error: "Failed to fetch influencers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      } else {
        delete body[field];
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
      } else {
        delete body[field];
      }
    }

    // Handle dateOfBirth
    if (body.dateOfBirth) {
      body.dateOfBirth = new Date(body.dateOfBirth);
    } else {
      delete body.dateOfBirth;
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const influencer = await prisma.influencer.create({
      data: body,
    });

    await prisma.activityLog.create({
      data: {
        entityType: "influencer",
        entityId: influencer.id,
        action: "created",
        description: `New influencer created: ${influencer.name || influencer.id}`,
      },
    });

    return NextResponse.json(influencer, { status: 201 });
  } catch (error) {
    console.error("Failed to create influencer:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create influencer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
