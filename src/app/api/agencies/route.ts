import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const distinct = searchParams.get("distinct");

    // Handle distinct value queries for filter dropdowns
    if (distinct === "cities") {
      const agencies = await prisma.agency.findMany({
        where: { city: { not: null } },
        select: { city: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
      });
      const cities = agencies
        .map((a) => a.city)
        .filter((c): c is string => c !== null && c.trim() !== "");
      return NextResponse.json(cities);
    }

    if (distinct === "states") {
      const agencies = await prisma.agency.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ["state"],
        orderBy: { state: "asc" },
      });
      const states = agencies
        .map((a) => a.state)
        .filter((s): s is string => s !== null && s.trim() !== "");
      return NextResponse.json(states);
    }

    // Standard agency list query with filters
    const search = searchParams.get("search") || "";
    const city = searchParams.get("city") || "";
    const state = searchParams.get("state") || "";
    const status = searchParams.get("status") || "";
    const pincode = searchParams.get("pincode") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }
 
    if (state) {
      where.state = { contains: state, mode: "insensitive" };
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    if (pincode) {
      where.pincode = { startsWith: pincode };
    }

    const agencies = await prisma.agency.findMany({
      where,
      include: {
        _count: {
          select: { influencers: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agencies);
  } catch (error) {
    console.error("Failed to fetch agencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch agencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const body = await request.json();

    const agency = await prisma.agency.create({
      data: {
        name: body.name,
        businessType: body.businessType || null,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
        gstNumber: body.gstNumber || null,
        panNumber: body.panNumber || null,
        commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : null,
        yearsInBusiness: body.yearsInBusiness ? parseInt(body.yearsInBusiness) : null,
        annualTurnover: body.annualTurnover || null,
        directorName: body.directorName || null,
        directorAadhar: body.directorAadhar || null,
        bankName: body.bankName || null,
        bankAccountNumber: body.bankAccountNumber || null,
        bankIfsc: body.bankIfsc || null,
        bankBranch: body.bankBranch || null,
        bankAccountType: body.bankAccountType || null,
        panDocumentUrl: body.panDocumentUrl || null,
        gstDocumentUrl: body.gstDocumentUrl || null,
        udhyamCertificateUrl: body.udhyamCertificateUrl || null,
        agencyRosterUrl: body.agencyRosterUrl || null,
        aadharDocumentUrl: body.aadharDocumentUrl || null,
        notes: body.notes || null,
      },
    });

    void logActivity({
      userId,
      entity: "agency",
      entityId: agency.id,
      action: "created",
      description: `Created agency: ${agency.name || agency.id}`,
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("Failed to create agency:", error);
    return NextResponse.json(
      { error: "Failed to create agency" },
      { status: 500 }
    );
  }
}
