"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getValidTransitions, STATUS_CONFIG, REQUIRES_CONFIRMATION } from "@/lib/state-machine";

interface InlineStatusSelectProps {
  collaborationId: string;
  currentStatus: string;
  requiresContentApproval?: boolean;
  collaborationType?: string;
  shopifyOrderId?: string | null;
  shopifyOrderNumber?: string | null;
  shopifyTrackingUrl?: string | null;
}

export function InlineStatusSelect({
  collaborationId,
  currentStatus,
  requiresContentApproval = true,
}: InlineStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const router = useRouter();

  const validTransitions = getValidTransitions(status, requiresContentApproval);
  const options = [status, ...validTransitions.filter(s => s !== status)];

  function handleSelectChange(newStatus: string) {
    if (newStatus === status) return;

    // Check if this status requires confirmation
    if (REQUIRES_CONFIRMATION[newStatus]) {
      setPendingStatus(newStatus);
      setShowConfirm(true);
      // Reset select to current status visually
      return;
    }

    executeStatusChange(newStatus);
  }

  function handleConfirm() {
    if (pendingStatus) {
      executeStatusChange(pendingStatus);
    }
    setShowConfirm(false);
    setPendingStatus(null);
  }

  function handleCancelConfirm() {
    setShowConfirm(false);
    setPendingStatus(null);
  }

  async function executeStatusChange(newStatus: string) {
    const previousStatus = status;
    setIsUpdating(true);
    setStatus(newStatus);

    try {
      const res = await fetch(`/api/collaborations/${collaborationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(previousStatus);
        if (data.requiresDueDate) {
          toast.error("Due date is required. Redirecting to add it...");
          setTimeout(() => {
            router.push(`/collaborations/${collaborationId}?needsDueDate=true`);
          }, 1500);
          return;
        }
        if (data.transitionErrors && data.transitionErrors.length > 0) {
          data.transitionErrors.forEach((err: string) => toast.error(err));
          return;
        }
        throw new Error(data.error || "Failed to update status");
      }

      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Status updated to ${label}`);

      if (data.autoActionsExecuted && data.autoActionsExecuted.length > 0) {
        const actionLabels: Record<string, string> = {
          create_shopify_order: "Shopify order created",
          create_payment_entries: "Payment entries created",
          mark_payments_due: "Payments marked as due",
          cancel_shopify_order: "Shopify order cancelled",
          void_pending_payments: "Pending payments voided",
        };
        const executed = data.autoActionsExecuted
          .map((a: string) => actionLabels[a] || a)
          .join(", ");
        toast.success(`Auto-actions: ${executed}`, { duration: 5000 });
      }

      if (data.transitionWarnings && data.transitionWarnings.length > 0) {
        data.transitionWarnings.forEach((w: string) =>
          toast.warning(w, { duration: 6000 })
        );
      }

      if (data.shopifyWarnings && data.shopifyWarnings.length > 0) {
        toast.warning(`Shopify: ${data.shopifyWarnings.join(". ")}`, { duration: 8000 });
      }

      router.refresh();
    } catch (err) {
      setStatus(previousStatus);
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  const colorClass = STATUS_CONFIG[status]?.color || "bg-gray-100 text-gray-700 border-gray-300";
  const isTerminal = status === "cancelled" || status === "completed";

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <select
        value={status}
        onChange={(e) => handleSelectChange(e.target.value)}
        disabled={isUpdating || isTerminal}
        className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs font-medium outline-none transition-colors ${colorClass} ${isUpdating ? "opacity-50 cursor-wait" : ""} ${isTerminal ? "cursor-not-allowed opacity-70" : ""}`}
        title={isTerminal ? `${STATUS_CONFIG[status]?.label} collaborations cannot be updated` : `Valid: ${validTransitions.map(s => STATUS_CONFIG[s]?.label).join(", ")}`}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {STATUS_CONFIG[s]?.label || s}
          </option>
        ))}
      </select>

      {/* Confirmation Modal */}
      {showConfirm && pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancelConfirm}>
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Status Change
            </h3>
            <p className="text-sm text-gray-600">
              {REQUIRES_CONFIRMATION[pendingStatus]}
            </p>
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-700">
                After this status, you will not be able to go back to Draft or cancel this collaboration.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm text-white bg-[#A6192E] hover:bg-[#8a1526] rounded-lg transition-colors font-medium"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
