import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markRead } from "@/lib/notifications";

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const ok = await markRead(userId, id);
  if (!ok) {
    // Either the row doesn't exist, isn't this user's, or is already read.
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
