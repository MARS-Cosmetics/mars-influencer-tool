"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "outreach", label: "Outreach" },
  { value: "negotiation", label: "Negotiation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "content_submitted", label: "Content Submitted" },
  { value: "content_approved", label: "Content Approved" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  outreach: "bg-blue-100 text-blue-700 border-blue-300",
  negotiation: "bg-yellow-100 text-yellow-700 border-yellow-300",
  confirmed: "bg-green-100 text-green-700 border-green-300",
  in_progress: "bg-indigo-100 text-indigo-700 border-indigo-300",
  content_submitted: "bg-purple-100 text-purple-700 border-purple-300",
  content_approved: "bg-teal-100 text-teal-700 border-teal-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
};

interface InlineStatusSelectProps {
  collaborationId: string;
  currentStatus: string;
}

export function InlineStatusSelect({ collaborationId, currentStatus }: InlineStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Sync with server prop when it changes (after refresh)
  useEffect(() => {
    if (!isUpdating) {
      setStatus(currentStatus);
    }
  }, [currentStatus, isUpdating]);

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;

    setIsUpdating(true);
    setStatus(newStatus); // Optimistic update

    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const label = statusOptions.find((s) => s.value === newStatus)?.label || newStatus;
      toast.success(`Status updated to ${label}`);

      // Refresh server data in background without resetting local state
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setStatus(currentStatus); // Rollback to server value
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  const colorClass = statusColors[status] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isUpdating}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs font-medium outline-none transition-colors ${colorClass} ${isUpdating ? "opacity-50" : ""}`}
    >
      {statusOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
