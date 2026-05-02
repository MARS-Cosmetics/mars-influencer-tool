import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { name?: string; slug?: string; description?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    let slug = body.slug?.trim().toLowerCase() || slugify(name);
    if (!slug) {
      return NextResponse.json(
        { error: "Could not derive a slug from the name" },
        { status: 400 }
      );
    }

    // Ensure uniqueness — append -2, -3, ... if collision
    let attempt = 1;
    let candidateSlug = slug;
    while (
      await prisma.brand.findUnique({ where: { slug: candidateSlug } })
    ) {
      attempt++;
      candidateSlug = `${slug}-${attempt}`;
      if (attempt > 100) {
        return NextResponse.json(
          { error: "Could not find a unique slug" },
          { status: 500 }
        );
      }
    }
    slug = candidateSlug;

    const created = await prisma.brand.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
      },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
