import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { logCreate } from "@/lib/activity-log";

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

    // Convert FK fields to Prisma relation syntax for create
    const relationMap: Record<string, string> = {
      agencyId: "agency",
      brandId: "brand",
      managerId: "creator",
    };
    for (const [fkField, relationName] of Object.entries(relationMap)) {
      if (fkField in body) {
        const val = body[fkField];
        delete body[fkField];
        if (val && val !== "") {
          body[relationName] = { connect: { id: val } };
        }
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

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const influencer = await prisma.influencer.create({
      data: body,
    });

    void logCreate(userId, "influencer", influencer.id, `Created influencer: ${influencer.name || influencer.id}`);

    return NextResponse.json(influencer, { status: 201 });
  } catch (error) {
    console.error("Failed to create influencer:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes("instagram_handle")) {
        return NextResponse.json(
          { error: "An influencer with this Instagram handle already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "A record with this value already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create influencer." },
      { status: 500 }
    );
  }
}
