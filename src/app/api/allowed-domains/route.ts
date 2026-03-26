import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const domains = await prisma.allowedDomain.findMany({
      where: { isActive: true },
      orderBy: { domain: "asc" },
    });

    return NextResponse.json(domains);
  } catch (error) {
    console.error("Failed to fetch allowed domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch allowed domains" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const normalized = domain.trim().toLowerCase();

    // Validate domain format: must contain at least one dot, no @
    if (!normalized.includes(".") || normalized.includes("@")) {
      return NextResponse.json(
        { error: "Invalid domain format. Must contain a dot and no @ symbol." },
        { status: 400 }
      );
    }

    // Upsert: create or reactivate if previously deactivated
    const record = await prisma.allowedDomain.upsert({
      where: { domain: normalized },
      update: { isActive: true },
      create: {
        domain: normalized,
        addedBy: session.user.id,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Failed to add allowed domain:", error);
    return NextResponse.json(
      { error: "Failed to add allowed domain" },
      { status: 500 }
    );
  }
}
