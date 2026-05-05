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

    const agency = await prisma.agency.update({
      where: { id },
      data: {
        name: body.name,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        website: body.website,
        address: body.address,
        city: body.city,
        state: body.state,
        gstNumber: body.gstNumber,
        panNumber: body.panNumber,
        commissionPct: body.commissionPct !== undefined && body.commissionPct !== "" ? parseFloat(body.commissionPct) : undefined,
        notes: body.notes,
        isActive: body.isActive,
      },
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
    return NextResponse.json(
      { error: "Failed to update agency" },
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
