import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const VALID_ROLES = new Set(["admin", "manager", "user"]);

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain a number";
  return null;
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await props.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      brandId: true,
      isActive: true,
      mustChangePassword: true,
      lastPasswordChange: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await props.params;

  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    brandId?: string | null;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "manager" | "user";
    brandId?: string | null;
    isActive?: boolean;
    mustChangePassword?: boolean;
    lastPasswordChange?: Date;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }

  if (typeof body.email === "string" && body.email.trim()) {
    const newEmail = body.email.toLowerCase().trim();
    if (newEmail !== target.email) {
      const dupe = await prisma.user.findUnique({ where: { email: newEmail } });
      if (dupe) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
      data.email = newEmail;
    }
  }

  if (typeof body.password === "string" && body.password.length > 0) {
    const pwError = validatePassword(body.password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    data.password = await hash(body.password, 12);
    data.mustChangePassword = false;
    data.lastPasswordChange = new Date();
  }

  if (typeof body.role === "string") {
    if (!VALID_ROLES.has(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (
      target.id === guard.session.userId &&
      target.role === "admin" &&
      body.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "You cannot demote yourself from admin" },
        { status: 400 }
      );
    }
    data.role = body.role as "admin" | "manager" | "user";
  }

  if (body.brandId === null || typeof body.brandId === "string") {
    data.brandId = body.brandId;
  }

  if (typeof body.isActive === "boolean") {
    if (target.id === guard.session.userId && body.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate yourself" },
        { status: 400 }
      );
    }
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      brandId: true,
      isActive: true,
      mustChangePassword: true,
      lastPasswordChange: true,
      updatedAt: true,
    },
  });

  // Auto-release ownership when a user is deactivated so their managed
  // influencers don't become permanently locked behind an inactive account.
  if (data.isActive === false) {
    await prisma.influencer.updateMany({
      where: { ownerId: id },
      data: { ownerId: null, ownedAt: null },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await props.params;

  if (id === guard.session.userId) {
    return NextResponse.json(
      { error: "You cannot deactivate yourself" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Auto-release ownership: deactivated users cannot be the lockholder.
  await prisma.influencer.updateMany({
    where: { ownerId: id },
    data: { ownerId: null, ownedAt: null },
  });

  return NextResponse.json({ success: true });
}
