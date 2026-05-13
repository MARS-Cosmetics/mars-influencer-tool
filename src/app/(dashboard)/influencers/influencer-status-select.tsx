"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "discovered", label: "Discovered", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "form_submitted", label: "Form Submitted", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "demographics_verified", label: "Demographics Verified", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "onboarded", label: "Onboarded", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "inactive", label: "Inactive", color: "bg-gray-200 text-gray-500 border-gray-300" },
  { value: "blacklisted", label: "Blacklisted", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "do_not_contact", label: "Do Not Contact", color: "bg-red-200 text-red-800 border-red-300" },
];

// Statuses that materially affect future workflow — confirm before applying so
// a misclick doesn't lock a creator out of campaigns.
const REQUIRES_CONFIRM: Record<string, string> = {
  blacklisted: "Blacklisted influencers are blocked from all future campaigns.",
  do_not_contact: "This influencer will be marked as Do Not Contact. Are you sure?",
};

export function InfluencerStatusSelect({
  influencerId,
  currentStatus,
}: {
  influencerId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  async function executeChange(newStatus: string) {
    const previous = status;
    setIsUpdating(true);
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/influencers/${influencerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(previous);
        toast.error(data.error || "Failed to update status");
        return;
      }
      const newLabel =
        STATUS_OPTIONS.find((o) => o.value === newStatus)?.label ?? newStatus;
      toast.success(`Status updated to ${newLabel}`);
      router.refresh();
    } catch (e) {
      setStatus(previous);
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleChange(newStatus: string) {
    if (newStatus === status) return;
    const confirmMsg = REQUIRES_CONFIRM[newStatus];
    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }
    executeChange(newStatus);
  }

  const current = STATUS_OPTIONS.find((o) => o.value === status);
  const colorClass = current?.color ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      disabled={isUpdating}
      className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs font-medium outline-none transition-colors ${colorClass} ${isUpdating ? "cursor-wait opacity-50" : ""}`}
      title="Change status"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
