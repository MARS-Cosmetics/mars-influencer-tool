import { prisma } from "@/lib/db";

/**
 * Get all user IDs that a given user can see collaborations for.
 * - admin: sees ALL
 * - manager: sees own + all direct/indirect reports
 * - user: sees only own
 */
export async function getVisibleUserIds(
  userId: string,
  role: string
): Promise<string[] | null> {
  // Admin sees everything — return null to skip filtering
  if (role === "admin") return null;

  // Start with the user's own ID
  const visibleIds = new Set<string>([userId]);

  if (role === "manager") {
    // Recursively find all direct and indirect reports
    await collectReports(userId, visibleIds);
  }

  return Array.from(visibleIds);
}

/**
 * Recursively collect all reports (direct + indirect) for a manager
 */
async function collectReports(
  managerId: string,
  collected: Set<string>
): Promise<void> {
  const directReports = await prisma.user.findMany({
    where: { managerId, isActive: true },
    select: { id: true },
  });

  for (const report of directReports) {
    if (!collected.has(report.id)) {
      collected.add(report.id);
      // Recursively get reports of this report (if they're also a manager)
      await collectReports(report.id, collected);
    }
  }
}

/**
 * Get the due date status for visual indicators
 */
export function getDueDateStatus(
  dueDate: Date | string | null | undefined
): "overdue" | "due_soon" | "normal" | "none" {
  if (!dueDate) return "none";

  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due_soon"; // within 3 days
  return "normal";
}

/**
 * CSS classes for due date status
 */
export const dueDateStyles: Record<string, string> = {
  overdue: "bg-red-50 border-l-4 border-l-red-500",
  due_soon: "bg-amber-50 border-l-4 border-l-amber-500",
  normal: "",
  none: "",
};

export const dueDateBadgeStyles: Record<string, string> = {
  overdue: "bg-red-100 text-red-800",
  due_soon: "bg-amber-100 text-amber-800",
  normal: "bg-gray-100 text-gray-800",
  none: "",
};
