import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.CollaborationWhereInput = {};

    if (search) {
      where.influencer = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (type) {
      where.type = type as Prisma.CollaborationWhereInput["type"];
    }

    if (status) {
      where.status = status as Prisma.CollaborationWhereInput["status"];
    }

    const [collaborations, total] = await Promise.all([
      prisma.collaboration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          influencer: {
            select: {
              id: true,
              name: true,
              instagramHandle: true,
              profileImageUrl: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.collaboration.count({ where }),
    ]);

    return NextResponse.json({ collaborations, total, limit, offset });
  } catch (error) {
    console.error("Failed to fetch collaborations:", error);
    return NextResponse.json(
      { error: "Failed to fetch collaborations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert date strings to Date objects
    const dateFields = ["dueDate"];
    for (const field of dateFields) {
      if (body[field]) {
        body[field] = new Date(body[field]);
      } else {
        delete body[field];
      }
    }

    // Convert agreedAmount to number
    if (body.agreedAmount !== undefined && body.agreedAmount !== "") {
      body.agreedAmount = parseFloat(body.agreedAmount);
    } else {
      delete body.agreedAmount;
    }

    // Convert deliverableCount to number
    if (body.deliverableCount !== undefined && body.deliverableCount !== "") {
      body.deliverableCount = parseInt(body.deliverableCount, 10);
    } else {
      delete body.deliverableCount;
    }

    // Convert agencyCommissionPct to number
    if (body.agencyCommissionPct !== undefined && body.agencyCommissionPct !== "") {
      body.agencyCommissionPct = parseFloat(body.agencyCommissionPct);
    } else {
      delete body.agencyCommissionPct;
    }

    // Parse deliverables if it's a string
    if (typeof body.deliverables === "string" && body.deliverables.trim()) {
      try {
        body.deliverables = JSON.parse(body.deliverables);
      } catch {
        // Keep as-is if not valid JSON; Prisma will handle error
      }
    }

    // Extract products and deliverables before cleaning
    const productsToAdd = body.products;
    delete body.products;

    const parsedDeliverables = Array.isArray(body.deliverables) ? body.deliverables : null;

    // Remove empty strings
    for (const key of Object.keys(body)) {
      if (body[key] === "") {
        delete body[key];
      }
    }

    // Remove dueDate from body — it's auto-computed from assets
    delete body.dueDate;

    // Determine approval status based on user's approval limit
    if (body.assignedTo && body.agreedAmount) {
      const assignee = await prisma.user.findUnique({
        where: { id: body.assignedTo },
        select: { approvalLimit: true, role: true, managerId: true },
      });

      if (assignee) {
        const amount = typeof body.agreedAmount === "number" ? body.agreedAmount : parseFloat(body.agreedAmount);
        const limit = assignee.approvalLimit ? Number(assignee.approvalLimit) : 0;

        if (assignee.role === "admin" || (limit > 0 && amount <= limit)) {
          body.approvalStatus = "auto_approved";
        } else {
          body.approvalStatus = "pending_approval";
        }
      }
    }

    const collaboration = await prisma.collaboration.create({
      data: body,
      include: {
        influencer: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    // Auto-create CollaborationProducts if provided
    if (Array.isArray(productsToAdd) && productsToAdd.length > 0) {
      await prisma.collaborationProduct.createMany({
        data: productsToAdd.map((p: { productId: string; quantity: number }) => ({
          collaborationId: collaboration.id,
          productId: p.productId,
          quantity: p.quantity || 1,
        })),
      });
    }

    // Auto-create Asset records from deliverables
    // Each deliverable row = one asset (deliverable IS the asset)
    if (parsedDeliverables && parsedDeliverables.length > 0) {
      const assetRecords = parsedDeliverables.map((d: { platform?: string; type?: string; dueDate?: string; hasAdRights?: boolean; notes?: string }) => ({
        collaborationId: collaboration.id,
        influencerId: body.influencerId,
        platform: d.platform || "instagram",
        contentType: d.type || "reel",
        status: "pending",
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        hasAdRights: d.hasAdRights || false,
      }));

      await prisma.asset.createMany({ data: assetRecords });

      // Auto-compute collaboration dueDate from latest asset dueDate
      const dueDates = assetRecords
        .map((a: { dueDate: Date | null }) => a.dueDate)
        .filter((d: Date | null): d is Date => d !== null);

      if (dueDates.length > 0) {
        const latestDueDate = new Date(Math.max(...dueDates.map((d: Date) => d.getTime())));
        await prisma.collaboration.update({
          where: { id: collaboration.id },
          data: { dueDate: latestDueDate },
        });
      }
    }

    // Auto-create Payment entries from payment terms (only for paid collaborations)
    if (
      body.type === "paid" &&
      body.agreedAmount &&
      body.paymentTermId
    ) {
      const paymentTerm = await prisma.paymentTerm.findUnique({
        where: { id: body.paymentTermId },
      });

      if (paymentTerm && Array.isArray(paymentTerm.installments)) {
        const installments = paymentTerm.installments as Array<{
          percentage: number;
          trigger: string;
          label: string;
        }>;
        const totalAmount = typeof body.agreedAmount === "number"
          ? body.agreedAmount
          : parseFloat(body.agreedAmount);

        const paymentRecords = installments.map((inst) => ({
          collaborationId: collaboration.id,
          influencerId: body.influencerId,
          amount: Math.round((totalAmount * inst.percentage) / 100 * 100) / 100,
          currency: body.currency || "INR",
          status: "pending",
          trigger: inst.trigger,
          installmentLabel: inst.label,
          // Copy agency info if present
          ...(body.agencyId ? {
            agencyId: body.agencyId,
            agencyCommissionPct: body.agencyCommissionPct,
            agencyCommissionAmount: body.agencyCommissionPct
              ? Math.round((totalAmount * inst.percentage / 100) * Number(body.agencyCommissionPct) / 100 * 100) / 100
              : null,
          } : {}),
        }));

        await prisma.payment.createMany({ data: paymentRecords });
      }
    }

    return NextResponse.json(collaboration, { status: 201 });
  } catch (error) {
    console.error("Failed to create collaboration:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to create collaboration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
