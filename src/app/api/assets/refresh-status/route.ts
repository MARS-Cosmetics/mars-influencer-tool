import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getLastGlobalRefresh,
  computeCooldownState,
} from "@/lib/global-refresh";

// Read-only. UI calls this on mount to render the button (enabled / disabled
// with timestamp). No side effects — does NOT claim a refresh slot.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "user";
  const last = await getLastGlobalRefresh();
  const state = computeCooldownState(last, role);

  return NextResponse.json({
    role,
    lastRefreshAt: state.lastRefreshAt,
    nextAllowedAt: state.nextAllowedAt,
    canRefresh: state.canRefresh,
    cooldownLabel: state.cooldownLabel,
    triggeredBy: last
      ? { userId: last.byUserId, role: last.byUserRole }
      : null,
  });
}
