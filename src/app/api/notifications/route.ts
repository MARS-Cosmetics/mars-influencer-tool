import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/lib/notifications";

/**
 * GET /api/notifications?limit=30&unreadOnly=false
 * Returns the current user's notifications newest-first and the unread count.
 * Client polls this every ~30s.
 */
export async function GET(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || "30");
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const [items, unread] = await Promise.all([
    listNotifications(userId, { limit, onlyUnread: unreadOnly }),
    unreadCount(userId),
  ]);

  return NextResponse.json({ items, unreadCount: unread });
}
