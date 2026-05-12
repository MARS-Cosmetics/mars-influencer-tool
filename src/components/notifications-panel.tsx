"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Send,
  Check,
  X,
  RotateCcw,
  Handshake,
  Lock,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  items: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
}

function iconFor(type: string) {
  switch (type) {
    case "proposal_submitted":
      return <Send className="h-4 w-4 text-blue-600" />;
    case "proposal_approved":
      return <Check className="h-4 w-4 text-emerald-600" />;
    case "proposal_rejected":
      return <X className="h-4 w-4 text-red-600" />;
    case "proposal_counter_offered":
      return <RotateCcw className="h-4 w-4 text-orange-600" />;
    case "proposal_accepted_by_influencer":
      return <Handshake className="h-4 w-4 text-purple-600" />;
    case "deal_locked":
      return <Lock className="h-4 w-4 text-emerald-700" />;
    default:
      return <Bell className="h-4 w-4 text-zinc-500" />;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsPanel({
  items,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  const router = useRouter();

  if (!items || items.length === 0) {
    return (
      <div className="flex w-[380px] flex-col items-center justify-center py-12">
        <Bell className="h-12 w-12 text-zinc-200" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-zinc-400">
          No notifications yet
        </p>
        <p className="mt-1 text-xs text-zinc-300">
          You&apos;ll be notified when proposals are submitted, reviewed, or
          deals are locked.
        </p>
      </div>
    );
  }

  async function handleClick(n: NotificationItem) {
    if (!n.readAt) await onMarkRead(n.id);
    router.push(n.actionUrl);
  }

  return (
    <div className="w-[380px]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 pb-2 pt-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          Notifications{" "}
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-[#A6192E] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => onMarkAllRead()}
            className="flex items-center gap-1 text-xs text-[#A6192E] transition-colors hover:text-[#8a1526]"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 ${
              !n.readAt ? "bg-zinc-50/60" : ""
            }`}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100">
              {iconFor(n.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm leading-snug ${
                    !n.readAt
                      ? "font-medium text-zinc-900"
                      : "text-zinc-700"
                  }`}
                >
                  {n.title}
                </p>
                {!n.readAt && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A6192E]" />
                )}
              </div>
              {n.body && (
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 line-clamp-2">
                  {n.body}
                </p>
              )}
              <p className="mt-1 text-[11px] text-zinc-400">
                {relativeTime(n.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
