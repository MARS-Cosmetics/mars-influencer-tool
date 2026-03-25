import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
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

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("Failed to create agency:", error);
    return NextResponse.json(
      { error: "Failed to create agency" },
      { status: 500 }
    );
  }
}
