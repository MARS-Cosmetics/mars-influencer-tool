import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AdminSession = {
  userId: string;
  email: string;
  role: "admin";
};

export async function requireAdmin(): Promise<
  { ok: true; session: AdminSession } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;

  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (user.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    session: { userId: user.id, email: user.email ?? "", role: "admin" },
  };
}
