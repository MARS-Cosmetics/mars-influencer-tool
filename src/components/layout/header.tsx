"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  NotificationsPanel,
  type NotificationItem,
} from "@/components/notifications-panel";
import { LogOut, Bell } from "lucide-react";

const POLL_INTERVAL_MS = 30_000;

export function Header() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/notifications?limit=30", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items?: NotificationItem[];
        unreadCount?: number;
      };
      // Defensive: API errors, malformed payload, or partial responses
      // would otherwise blow up the panel's items.length check.
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      // swallow — next poll will retry
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Initial fetch + polling. Only runs when authenticated.
  useEffect(() => {
    if (status !== "authenticated") return;
    void refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    // Also re-poll when the tab regains focus so users see fresh state
    // immediately after coming back from another tab.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [status, refresh]);

  async function handleMarkRead(id: string) {
    // Optimistic update so the dropdown feels instant.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // server will re-sync on next poll
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnread(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      // ignored — next poll resyncs
    }
  }

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A6192E] px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-auto p-0">
            <NotificationsPanel
              items={items}
              unreadCount={unread}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </PopoverContent>
        </Popover>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-3 pr-1 outline-none transition-colors hover:bg-zinc-50">
              <div className="text-right">
                <p className="text-sm font-medium leading-none text-zinc-900">
                  {session.user.name}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-zinc-500">
                  {session.user.role}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-zinc-200">
                <AvatarFallback className="bg-[#A6192E] text-[11px] font-medium text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-zinc-500">{session.user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
