import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await markAllRead(userId);
  return NextResponse.json({ marked: count });
}
