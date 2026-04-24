"use client";

import { useState } from "react";
import {
  Bell,
  Handshake,
  CalendarClock,
  DollarSign,
  MessageSquare,
  CheckCheck,
} from "lucide-react";

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    icon: <Handshake className="h-4 w-4 text-[#A6192E]" />,
    title: "New collaboration request",
    description: "Jade Morales wants to collaborate on the summer campaign.",
    timestamp: "2 min ago",
    read: false,
  },
  {
    id: "2",
    icon: <CalendarClock className="h-4 w-4 text-amber-500" />,
    title: "Campaign deadline approaching",
    description: 'The "Spring Launch" campaign is due in 3 days.',
    timestamp: "1 hr ago",
    read: false,
  },
  {
    id: "3",
    icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
    title: "Payment received",
    description: "You received $2,400 for the Q1 deliverables.",
    timestamp: "5 hrs ago",
    read: true,
  },
  {
    id: "4",
    icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
    title: "New message from agency",
    description: "Bright Talent Agency sent you a contract update.",
    timestamp: "Yesterday",
    read: true,
  },
];

export function NotificationsPanel() {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex w-[380px] flex-col items-center justify-center py-12">
        <Bell className="h-12 w-12 text-zinc-200" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-zinc-400">
          No notifications yet
        </p>
        <p className="mt-1 text-xs text-zinc-300">
          We&apos;ll notify you when something arrives
        </p>
      </div>
    );
  }

  return (
    <div className="w-[380px]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 pb-2">
        <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-[#A6192E] transition-colors hover:text-[#8a1526]"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => markAsRead(notification.id)}
            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 ${
              !notification.read ? "bg-zinc-50/60" : ""
            }`}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100">
              {notification.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm leading-snug ${
                    !notification.read
                      ? "font-medium text-zinc-900"
                      : "text-zinc-700"
                  }`}
                >
                  {notification.title}
                </p>
                {!notification.read && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A6192E]" />
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {notification.description}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {notification.timestamp}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function useUnreadCount() {
  // In a real app this would come from a shared store/context.
  // For now, we return the initial unread count so the header badge works.
  return initialNotifications.filter((n) => !n.read).length;
}
