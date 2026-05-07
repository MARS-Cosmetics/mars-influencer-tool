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
    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        influencers: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(agency);
  } catch (error) {
    console.error("Failed to fetch agency:", error);
    return NextResponse.json(
      { error: "Failed to fetch agency" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const { id } = await params;
    const body = await request.json();

    const previous = await prisma.agency.findUnique({
      where: { id },
      select: { name: true, commissionPct: true, isActive: true },
    });

    // Build update data — only include keys actually present in the body so
    // a partial PATCH-style call (e.g. just toggling isActive) won't blank
    // out unrelated fields.
    const data: Prisma.AgencyUpdateInput = {};
    const stringFields = [
      "name",
      "contactPerson",
      "email",
      "phone",
      "website",
      "address",
      "city",
      "state",
      "pincode",
      "gstNumber",
      "panNumber",
      "businessType",
      "annualTurnover",
      "directorName",
      "directorAadhar",
      "bankName",
      "bankAccountNumber",
      "bankIfsc",
      "bankBranch",
      "bankAccountType",
      "notes",
    ] as const;
    for (const field of stringFields) {
      if (field in body) {
        // Empty string → null (Prisma stores null, not "")
        (data as Record<string, unknown>)[field] = body[field] === "" ? null : body[field];
      }
    }
    if ("commissionPct" in body) {
      data.commissionPct =
        body.commissionPct === "" || body.commissionPct == null
          ? null
          : parseFloat(body.commissionPct);
    }
    if ("yearsInBusiness" in body) {
      data.yearsInBusiness =
        body.yearsInBusiness === "" || body.yearsInBusiness == null
          ? null
          : parseInt(body.yearsInBusiness, 10);
    }
    if ("isActive" in body) data.isActive = Boolean(body.isActive);

    const agency = await prisma.agency.update({
      where: { id },
      data,
    });

    void logFieldDiffs(
      userId,
      "agency",
      id,
      previous as Record<string, unknown> | null,
      agency as unknown as Record<string, unknown>,
      ["name", "commissionPct", "isActive"],
    );

    return NextResponse.json(agency);
  } catch (error) {
    console.error("Failed to update agency:", error);
    let message = "Failed to update agency";
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

    const agency = await prisma.agency.update({
      where: { id },
      data: { isActive: false },
      select: { name: true },
    });

    void logDelete(userId, "agency", id, `Deactivated agency: ${agency.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to deactivate agency:", error);
    return NextResponse.json(
      { error: "Failed to deactivate agency" },
      { status: 500 }
    );
  }
}
