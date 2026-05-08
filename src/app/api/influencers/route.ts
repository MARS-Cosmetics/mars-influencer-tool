import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { logCreate } from "@/lib/activity-log";
import {
  assertCanClaim,
  InfluencerAlreadyExistsError,
  InfluencerOwnedByOtherError,
} from "@/lib/influencer-ownership";

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

    // metricsLastSyncedAt comes in as ISO string from the Add Influencer form
    // when the operator has just fetched fresh data from Influenzer.
    if (body.metricsLastSyncedAt) {
      const dt = new Date(body.metricsLastSyncedAt);
      body.metricsLastSyncedAt = isNaN(dt.getTime()) ? null : dt;
      if (body.metricsLastSyncedAt === null) delete body.metricsLastSyncedAt;
    }

    // Coerce isVerified — form may send "true"/"false" strings or actual booleans.
    if (body.isVerified !== undefined) {
      body.isVerified =
        body.isVerified === true || body.isVerified === "true";
    }

    // igLast8ReelViews must be an Int[] for Prisma. Accept either an array
    // (from the API-fetch path) or a comma-separated string (manual entry).
    if (body.igLast8ReelViews !== undefined) {
      const raw = body.igLast8ReelViews;
      let arr: number[] = [];
      if (Array.isArray(raw)) {
        arr = raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      } else if (typeof raw === "string" && raw.trim()) {
        arr = raw
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n));
      }
      if (arr.length) body.igLast8ReelViews = arr;
      else delete body.igLast8ReelViews;
    }

    // JSON-typed audience breakdowns. Pass objects through; reject anything
    // else (Prisma will error on a stringified object, surface it cleanly).
    for (const f of [
      "igAudienceAgeBreakdown",
      "igAudienceTopCities",
      "igAudienceTopCountries",
      "igAudienceLanguageSplit",
    ] as const) {
      const v = body[f];
      if (v == null || v === "") {
        delete body[f];
      } else if (typeof v !== "object") {
        // Operator typed something into a hidden field by accident — drop it
        // rather than crash the request.
        delete body[f];
      }
    }

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Org-wide ownership lock: if any influencer with the submitted handles
    // is already claimed by another user, refuse the create with details so
    // the UI can render "Managed by X". If a row exists but is unowned (legacy)
    // or owned by the same user, redirect to the existing record.
    const claim = await assertCanClaim(
      {
        instagramHandle: body.instagramHandle ?? null,
        youtubeHandle: body.youtubeHandle ?? null,
        twitterHandle: body.twitterHandle ?? null,
        tiktokHandle: body.tiktokHandle ?? null,
        snapchatHandle: body.snapchatHandle ?? null,
      },
      userId,
    );
    if (claim) {
      throw new InfluencerAlreadyExistsError(claim.existingId, null);
    }

    const influencer = await prisma.influencer.create({
      data: {
        ...body,
        ownerId: userId,
        ownedAt: new Date(),
        createdBy: body.createdBy ?? userId,
      },
    });

    void logCreate(userId, "influencer", influencer.id, `Created influencer: ${influencer.name || influencer.id}`);

    return NextResponse.json(influencer, { status: 201 });
  } catch (error) {
    if (error instanceof InfluencerOwnedByOtherError) {
      return NextResponse.json(
        {
          error: `Managed by ${error.ownerName ?? "another user"}`,
          code: "OWNED_BY_OTHER",
          influencerId: error.influencerId,
          ownerName: error.ownerName,
          ownerEmail: error.ownerEmail,
          ownedAt: error.ownedAt,
        },
        { status: 409 },
      );
    }
    if (error instanceof InfluencerAlreadyExistsError) {
      return NextResponse.json(
        {
          error: "Influencer already in your roster",
          code: "ALREADY_EXISTS",
          influencerId: error.influencerId,
        },
        { status: 409 },
      );
    }
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
