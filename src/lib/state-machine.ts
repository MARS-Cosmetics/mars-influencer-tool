// Status configuration with sequence numbers, requirements, and auto-actions
export interface StatusConfig {
  value: string;
  label: string;
  sequence: number;
  color: string; // tailwind class
  requirements: string[]; // human-readable requirements
  autoActions: string[]; // what happens automatically when entering this status
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    value: "draft",
    label: "Draft",
    sequence: 10,
    color: "bg-gray-100 text-gray-700 border-gray-300",
    requirements: [],
    autoActions: [],
  },
  outreach: {
    value: "outreach",
    label: "Outreach",
    sequence: 20,
    color: "bg-blue-100 text-blue-700 border-blue-300",
    requirements: ["Influencer must be assigned"],
    autoActions: [],
  },
  negotiation: {
    value: "negotiation",
    label: "Negotiation",
    sequence: 30,
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    requirements: [],
    autoActions: [],
  },
  confirmed: {
    value: "confirmed",
    label: "Confirmed",
    sequence: 40,
    color: "bg-green-100 text-green-700 border-green-300",
    requirements: ["Products must be linked", "Influencer address required", "Influencer phone number required", "Due date required"],
    autoActions: ["Create Shopify order (₹1)", "Create payment entries from payment terms"],
  },
  in_progress: {
    value: "in_progress",
    label: "In Progress",
    sequence: 50,
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
    requirements: ["Shopify order must exist (or be manually confirmed)"],
    autoActions: [],
  },
  content_submitted: {
    value: "content_submitted",
    label: "Content Submitted",
    sequence: 60,
    color: "bg-purple-100 text-purple-700 border-purple-300",
    requirements: ["At least 1 asset must be linked"],
    autoActions: [],
  },
  content_approved: {
    value: "content_approved",
    label: "Content Approved",
    sequence: 70,
    color: "bg-teal-100 text-teal-700 border-teal-300",
    requirements: [],
    autoActions: [],
  },
  completed: {
    value: "completed",
    label: "Completed",
    sequence: 80,
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    requirements: [],
    autoActions: ["Mark triggered payments as due"],
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    sequence: 0,
    color: "bg-red-100 text-red-700 border-red-300",
    requirements: [],
    autoActions: ["Cancel Shopify order if exists", "Void pending payments"],
  },
};

// Statuses that require a confirmation popup before entering
export const REQUIRES_CONFIRMATION: Record<string, string> = {
  confirmed: "A Shopify order will be created and cannot be changed later. Are you sure you want to confirm this collaboration?",
  in_progress: "This will mark the collaboration as in progress. The Shopify order has already been placed. Continue?",
};

// Get valid next statuses from current status
// Rules:
// - Forward moves must be sequential (next step only)
// - Can skip content_submitted/content_approved if not required
// - Cancellation only allowed BEFORE confirmed (draft, outreach, negotiation)
// - No backward movement after confirmed (order has been placed)
// - Can go back one step only before confirmed
export function getValidTransitions(currentStatus: string, requiresContentApproval: boolean): string[] {
  const current = STATUS_CONFIG[currentStatus];
  if (!current) return [];

  // Terminal states — no transitions
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return [];
  }

  const validStatuses: string[] = [];

  const allStatuses = Object.values(STATUS_CONFIG)
    .filter(s => s.value !== "cancelled")
    .sort((a, b) => a.sequence - b.sequence);

  const currentIndex = allStatuses.findIndex(s => s.value === currentStatus);
  const confirmedIndex = allStatuses.findIndex(s => s.value === "confirmed");

  // Cancellation only allowed BEFORE confirmed status
  // Once confirmed (order placed on Shopify), cannot cancel
  if (currentIndex < confirmedIndex) {
    validStatuses.push("cancelled");
  }

  // Forward movement: allow jumping to ANY future status
  // Requirements are validated separately in validateTransition()
  for (let i = currentIndex + 1; i < allStatuses.length; i++) {
    const futureStatus = allStatuses[i];

    // Skip content_submitted/content_approved if not required
    if (!requiresContentApproval &&
        (futureStatus.value === "content_submitted" || futureStatus.value === "content_approved")) {
      continue;
    }

    validStatuses.push(futureStatus.value);
  }

  // Backward movement only allowed BEFORE confirmed (one step back)
  // After confirmed (order placed), no going back
  if (currentIndex > 0 && currentIndex < confirmedIndex) {
    const prevStatus = allStatuses[currentIndex - 1];
    validStatuses.push(prevStatus.value);
  }

  return validStatuses;
}

// Validate if a transition is allowed and check requirements
// Returns { valid: boolean, errors: string[] }
export interface TransitionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CollaborationContext {
  influencerId: string;
  hasProducts: boolean;
  hasAddress: boolean;
  hasPhone: boolean;
  hasDueDate: boolean;
  hasShopifyOrder: boolean;
  assetCount: number;
  requiresContentApproval: boolean;
  type: string; // barter, paid, etc.
}

export function validateTransition(
  fromStatus: string,
  toStatus: string,
  context: CollaborationContext
): TransitionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if transition is valid
  const validTransitions = getValidTransitions(fromStatus, context.requiresContentApproval);
  if (!validTransitions.includes(toStatus)) {
    errors.push(`Cannot move from "${STATUS_CONFIG[fromStatus]?.label}" to "${STATUS_CONFIG[toStatus]?.label}". Valid next statuses: ${validTransitions.map(s => STATUS_CONFIG[s]?.label).join(", ")}`);
    return { valid: false, errors, warnings };
  }

  // Check requirements for the target status
  if (toStatus === "outreach" && !context.influencerId) {
    errors.push("Influencer must be assigned");
  }

  if (toStatus === "confirmed") {
    if (!context.hasProducts) errors.push("At least one product must be linked");
    if (!context.hasAddress) errors.push("Influencer address is required");
    if (!context.hasPhone) errors.push("Influencer phone number is required for Shopify order");
    if (!context.hasDueDate) errors.push("Due date is required");
  }

  if (toStatus === "in_progress") {
    if (!context.hasShopifyOrder) {
      warnings.push("No Shopify order exists. It may have failed to create or products may not be synced.");
    }
  }

  if (toStatus === "content_submitted") {
    if (context.assetCount === 0) {
      errors.push("At least one asset/deliverable must be linked");
    }
  }

  // No Shopify order for cancelled
  // (handled in auto-actions, not a requirement)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Get auto-actions that should run when entering a status
export function getAutoActions(toStatus: string, context: CollaborationContext): string[] {
  const actions: string[] = [];

  if (toStatus === "confirmed") {
    if (context.type !== "barter" && context.type !== "pr_gifting") {
      actions.push("create_shopify_order");
    }
    actions.push("create_payment_entries");
  }

  if (toStatus === "completed") {
    actions.push("mark_payments_due");
  }

  if (toStatus === "cancelled") {
    actions.push("cancel_shopify_order");
    actions.push("void_pending_payments");
  }

  return actions;
}
