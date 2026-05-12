/**
 * In-app notifications. Server-side only.
 *
 * Fan-out happens at write time — one row per recipient — so the unread-count
 * query stays O(1) per user (indexed on recipient_id + read_at + created_at).
 *
 * All helpers swallow errors and only log: a failed notification must NEVER
 * break the user request that triggered it (mirror of activity-log.ts).
 */
import { prisma } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma";

export interface NotifyOpts {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  actionUrl: string;
  entityType?: string | null;
  entityId?: string | null;
}

export async function notifyUser(opts: NotifyOpts): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: opts.recipientId,
        type: opts.type,
        title: opts.title,
        body: opts.body ?? null,
        actionUrl: opts.actionUrl,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
      },
    });
  } catch (e) {
    console.error(`[notifications] failed for user ${opts.recipientId}:`, e);
  }
}

/**
 * Fan out a notification to every admin and manager. Used when a handler
 * submits a proposal, marks influencer-accepted, or locks the deal — the
 * whole management chain needs to see it.
 *
 * `exceptUserId` lets the caller skip notifying the person who triggered the
 * event (e.g. an admin who happened to be the assignee).
 */
export async function notifyManagers(
  base: Omit<NotifyOpts, "recipientId">,
  exceptUserId?: string,
): Promise<void> {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        role: { in: ["admin", "manager"] },
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        recipientId: u.id,
        type: base.type,
        title: base.title,
        body: base.body ?? null,
        actionUrl: base.actionUrl,
        entityType: base.entityType ?? null,
        entityId: base.entityId ?? null,
      })),
    });
  } catch (e) {
    console.error(`[notifications] manager fan-out failed:`, e);
  }
}

export async function listNotifications(
  userId: string,
  opts: { limit?: number; onlyUnread?: boolean } = {},
) {
  const limit = Math.min(opts.limit ?? 30, 100);
  return prisma.notification.findMany({
    where: {
      recipientId: userId,
      ...(opts.onlyUnread ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: userId, readAt: null },
  });
}

export async function markRead(userId: string, id: string): Promise<boolean> {
  const res = await prisma.notification.updateMany({
    where: { id, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count > 0;
}

export async function markAllRead(userId: string): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}
