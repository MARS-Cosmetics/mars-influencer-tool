import { describe, it, expect } from "vitest";
import {
  STATUS_CONFIG,
  REQUIRES_CONFIRMATION,
  getValidTransitions,
  validateTransition,
  getAutoActions,
  type CollaborationContext,
} from "@/lib/state-machine";

// Helper: default context with everything satisfied
function makeContext(overrides: Partial<CollaborationContext> = {}): CollaborationContext {
  return {
    influencerId: "inf-123",
    hasProducts: true,
    hasAddress: true,
    hasDueDate: true,
    hasShopifyOrder: true,
    assetCount: 2,
    requiresContentApproval: true,
    type: "paid",
    ...overrides,
  };
}

// ============================================================
// STATUS_CONFIG
// ============================================================
describe("STATUS_CONFIG", () => {
  it("should have exactly 9 statuses", () => {
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(9);
  });

  it("should have all required statuses", () => {
    const expected = [
      "draft", "outreach", "negotiation", "confirmed",
      "in_progress", "content_submitted", "content_approved",
      "completed", "cancelled",
    ];
    expected.forEach((s) => {
      expect(STATUS_CONFIG[s]).toBeDefined();
    });
  });

  it("should have sequential sequence numbers (except cancelled=0)", () => {
    const statuses = Object.values(STATUS_CONFIG)
      .filter((s) => s.value !== "cancelled")
      .sort((a, b) => a.sequence - b.sequence);

    for (let i = 1; i < statuses.length; i++) {
      expect(statuses[i].sequence).toBeGreaterThan(statuses[i - 1].sequence);
    }
  });

  it("cancelled should have sequence 0", () => {
    expect(STATUS_CONFIG.cancelled.sequence).toBe(0);
  });

  it("each status should have value, label, color, sequence", () => {
    Object.values(STATUS_CONFIG).forEach((s) => {
      expect(s.value).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.color).toBeTruthy();
      expect(typeof s.sequence).toBe("number");
    });
  });
});

// ============================================================
// REQUIRES_CONFIRMATION
// ============================================================
describe("REQUIRES_CONFIRMATION", () => {
  it("should require confirmation for confirmed status", () => {
    expect(REQUIRES_CONFIRMATION.confirmed).toBeDefined();
    expect(REQUIRES_CONFIRMATION.confirmed).toContain("Shopify");
  });

  it("should require confirmation for in_progress status", () => {
    expect(REQUIRES_CONFIRMATION.in_progress).toBeDefined();
  });

  it("should NOT require confirmation for draft, outreach, negotiation", () => {
    expect(REQUIRES_CONFIRMATION.draft).toBeUndefined();
    expect(REQUIRES_CONFIRMATION.outreach).toBeUndefined();
    expect(REQUIRES_CONFIRMATION.negotiation).toBeUndefined();
  });
});

// ============================================================
// getValidTransitions — Forward Movement
// ============================================================
describe("getValidTransitions - Forward Movement", () => {
  it("draft → outreach (next step forward)", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).toContain("outreach");
  });

  it("outreach → negotiation", () => {
    const transitions = getValidTransitions("outreach", true);
    expect(transitions).toContain("negotiation");
  });

  it("negotiation → confirmed", () => {
    const transitions = getValidTransitions("negotiation", true);
    expect(transitions).toContain("confirmed");
  });

  it("confirmed → in_progress", () => {
    const transitions = getValidTransitions("confirmed", true);
    expect(transitions).toContain("in_progress");
  });

  it("in_progress → content_submitted (when content approval required)", () => {
    const transitions = getValidTransitions("in_progress", true);
    expect(transitions).toContain("content_submitted");
  });

  it("content_submitted → content_approved", () => {
    const transitions = getValidTransitions("content_submitted", true);
    expect(transitions).toContain("content_approved");
  });

  it("content_approved → completed", () => {
    const transitions = getValidTransitions("content_approved", true);
    expect(transitions).toContain("completed");
  });
});

// ============================================================
// getValidTransitions — Cannot Skip Steps
// ============================================================
describe("getValidTransitions - Cannot Skip Steps", () => {
  it("draft CANNOT go directly to confirmed", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).not.toContain("confirmed");
  });

  it("draft CANNOT go directly to in_progress", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).not.toContain("in_progress");
  });

  it("draft CANNOT go directly to completed", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).not.toContain("completed");
  });

  it("outreach CANNOT go directly to confirmed", () => {
    const transitions = getValidTransitions("outreach", true);
    expect(transitions).not.toContain("confirmed");
  });

  it("negotiation CANNOT go directly to in_progress", () => {
    const transitions = getValidTransitions("negotiation", true);
    expect(transitions).not.toContain("in_progress");
  });
});

// ============================================================
// getValidTransitions — Backward Movement
// ============================================================
describe("getValidTransitions - Backward Movement", () => {
  it("outreach can go back to draft (before confirmed)", () => {
    const transitions = getValidTransitions("outreach", true);
    expect(transitions).toContain("draft");
  });

  it("negotiation can go back to outreach (before confirmed)", () => {
    const transitions = getValidTransitions("negotiation", true);
    expect(transitions).toContain("outreach");
  });

  it("confirmed CANNOT go back to negotiation (after confirmed, locked)", () => {
    const transitions = getValidTransitions("confirmed", true);
    expect(transitions).not.toContain("negotiation");
  });

  it("confirmed CANNOT go back to draft", () => {
    const transitions = getValidTransitions("confirmed", true);
    expect(transitions).not.toContain("draft");
  });

  it("in_progress CANNOT go back to confirmed", () => {
    const transitions = getValidTransitions("in_progress", true);
    expect(transitions).not.toContain("confirmed");
  });

  it("in_progress CANNOT go back to draft", () => {
    const transitions = getValidTransitions("in_progress", true);
    expect(transitions).not.toContain("draft");
  });

  it("content_submitted CANNOT go back to in_progress", () => {
    const transitions = getValidTransitions("content_submitted", true);
    expect(transitions).not.toContain("in_progress");
  });
});

// ============================================================
// getValidTransitions — Cancellation Rules
// ============================================================
describe("getValidTransitions - Cancellation Rules", () => {
  it("draft CAN be cancelled", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).toContain("cancelled");
  });

  it("outreach CAN be cancelled", () => {
    const transitions = getValidTransitions("outreach", true);
    expect(transitions).toContain("cancelled");
  });

  it("negotiation CAN be cancelled", () => {
    const transitions = getValidTransitions("negotiation", true);
    expect(transitions).toContain("cancelled");
  });

  it("confirmed CANNOT be cancelled (order already placed)", () => {
    const transitions = getValidTransitions("confirmed", true);
    expect(transitions).not.toContain("cancelled");
  });

  it("in_progress CANNOT be cancelled", () => {
    const transitions = getValidTransitions("in_progress", true);
    expect(transitions).not.toContain("cancelled");
  });

  it("content_submitted CANNOT be cancelled", () => {
    const transitions = getValidTransitions("content_submitted", true);
    expect(transitions).not.toContain("cancelled");
  });

  it("content_approved CANNOT be cancelled", () => {
    const transitions = getValidTransitions("content_approved", true);
    expect(transitions).not.toContain("cancelled");
  });
});

// ============================================================
// getValidTransitions — Terminal States
// ============================================================
describe("getValidTransitions - Terminal States", () => {
  it("completed has NO valid transitions", () => {
    const transitions = getValidTransitions("completed", true);
    expect(transitions).toHaveLength(0);
  });

  it("cancelled has NO valid transitions", () => {
    const transitions = getValidTransitions("cancelled", true);
    expect(transitions).toHaveLength(0);
  });
});

// ============================================================
// getValidTransitions — Content Approval Skipping
// ============================================================
describe("getValidTransitions - Content Approval Skipping", () => {
  it("in_progress → completed directly when content approval NOT required", () => {
    const transitions = getValidTransitions("in_progress", false);
    expect(transitions).toContain("completed");
    expect(transitions).not.toContain("content_submitted");
  });

  it("in_progress → content_submitted when content approval IS required", () => {
    const transitions = getValidTransitions("in_progress", true);
    expect(transitions).toContain("content_submitted");
    expect(transitions).not.toContain("completed");
  });
});

// ============================================================
// getValidTransitions — Edge Cases
// ============================================================
describe("getValidTransitions - Edge Cases", () => {
  it("returns empty array for unknown status", () => {
    const transitions = getValidTransitions("nonexistent", true);
    expect(transitions).toHaveLength(0);
  });

  it("draft has exactly 2 options: outreach and cancelled", () => {
    const transitions = getValidTransitions("draft", true);
    expect(transitions).toHaveLength(2);
    expect(transitions).toContain("outreach");
    expect(transitions).toContain("cancelled");
  });

  it("confirmed has exactly 1 option: in_progress (no cancel, no backward)", () => {
    const transitions = getValidTransitions("confirmed", true);
    expect(transitions).toHaveLength(1);
    expect(transitions).toContain("in_progress");
  });
});

// ============================================================
// validateTransition — Requirements
// ============================================================
describe("validateTransition - Requirements", () => {
  it("confirmed requires products", () => {
    const ctx = makeContext({ hasProducts: false });
    const result = validateTransition("negotiation", "confirmed", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one product must be linked");
  });

  it("confirmed requires address", () => {
    const ctx = makeContext({ hasAddress: false });
    const result = validateTransition("negotiation", "confirmed", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Influencer address is required");
  });

  it("confirmed requires due date", () => {
    const ctx = makeContext({ hasDueDate: false });
    const result = validateTransition("negotiation", "confirmed", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Due date is required");
  });

  it("confirmed with all requirements met is valid", () => {
    const ctx = makeContext();
    const result = validateTransition("negotiation", "confirmed", ctx);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("confirmed with multiple missing requirements shows all errors", () => {
    const ctx = makeContext({ hasProducts: false, hasAddress: false, hasDueDate: false });
    const result = validateTransition("negotiation", "confirmed", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it("outreach requires influencer", () => {
    const ctx = makeContext({ influencerId: "" });
    const result = validateTransition("draft", "outreach", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Influencer must be assigned");
  });

  it("content_submitted requires at least 1 asset", () => {
    const ctx = makeContext({ assetCount: 0 });
    const result = validateTransition("in_progress", "content_submitted", ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one asset/deliverable must be linked");
  });

  it("in_progress warns when no Shopify order", () => {
    const ctx = makeContext({ hasShopifyOrder: false });
    const result = validateTransition("confirmed", "in_progress", ctx);
    expect(result.valid).toBe(true); // Warning, not error
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================
// validateTransition — Invalid Transitions
// ============================================================
describe("validateTransition - Invalid Transitions", () => {
  it("draft → confirmed is invalid (skipping steps)", () => {
    const ctx = makeContext();
    const result = validateTransition("draft", "confirmed", ctx);
    expect(result.valid).toBe(false);
  });

  it("confirmed → draft is invalid (backward after confirmed)", () => {
    const ctx = makeContext();
    const result = validateTransition("confirmed", "draft", ctx);
    expect(result.valid).toBe(false);
  });

  it("confirmed → cancelled is invalid (no cancellation after confirmed)", () => {
    const ctx = makeContext();
    const result = validateTransition("confirmed", "cancelled", ctx);
    expect(result.valid).toBe(false);
  });

  it("completed → anything is invalid (terminal)", () => {
    const ctx = makeContext();
    const result = validateTransition("completed", "draft", ctx);
    expect(result.valid).toBe(false);
  });

  it("cancelled → anything is invalid (terminal)", () => {
    const ctx = makeContext();
    const result = validateTransition("cancelled", "draft", ctx);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// getAutoActions
// ============================================================
describe("getAutoActions", () => {
  it("confirmed triggers shopify order for paid collaborations", () => {
    const ctx = makeContext({ type: "paid" });
    const actions = getAutoActions("confirmed", ctx);
    expect(actions).toContain("create_shopify_order");
    expect(actions).toContain("create_payment_entries");
  });

  it("confirmed does NOT trigger shopify order for barter", () => {
    const ctx = makeContext({ type: "barter" });
    const actions = getAutoActions("confirmed", ctx);
    expect(actions).not.toContain("create_shopify_order");
    expect(actions).toContain("create_payment_entries");
  });

  it("confirmed does NOT trigger shopify order for pr_gifting", () => {
    const ctx = makeContext({ type: "pr_gifting" });
    const actions = getAutoActions("confirmed", ctx);
    expect(actions).not.toContain("create_shopify_order");
  });

  it("completed triggers mark_payments_due", () => {
    const ctx = makeContext();
    const actions = getAutoActions("completed", ctx);
    expect(actions).toContain("mark_payments_due");
  });

  it("cancelled triggers cancel_shopify_order and void_pending_payments", () => {
    const ctx = makeContext();
    const actions = getAutoActions("cancelled", ctx);
    expect(actions).toContain("cancel_shopify_order");
    expect(actions).toContain("void_pending_payments");
  });

  it("draft triggers no actions", () => {
    const ctx = makeContext();
    const actions = getAutoActions("draft", ctx);
    expect(actions).toHaveLength(0);
  });

  it("in_progress triggers no actions", () => {
    const ctx = makeContext();
    const actions = getAutoActions("in_progress", ctx);
    expect(actions).toHaveLength(0);
  });
});

// ============================================================
// Full Flow Integration Tests
// ============================================================
describe("Full Flow - Happy Path", () => {
  it("paid collaboration full flow with content approval", () => {
    const ctx = makeContext({ requiresContentApproval: true, type: "paid" });
    const flow = ["draft", "outreach", "negotiation", "confirmed", "in_progress", "content_submitted", "content_approved", "completed"];

    for (let i = 0; i < flow.length - 1; i++) {
      const from = flow[i];
      const to = flow[i + 1];
      const transitions = getValidTransitions(from, true);
      expect(transitions).toContain(to);

      const validation = validateTransition(from, to, ctx);
      expect(validation.valid).toBe(true);
    }
  });

  it("barter collaboration skips content approval", () => {
    const ctx = makeContext({ requiresContentApproval: false, type: "barter" });
    const flow = ["draft", "outreach", "negotiation", "confirmed", "in_progress", "completed"];

    for (let i = 0; i < flow.length - 1; i++) {
      const from = flow[i];
      const to = flow[i + 1];
      const transitions = getValidTransitions(from, false);
      expect(transitions).toContain(to);
    }
  });

  it("early cancellation flow", () => {
    const ctx = makeContext();

    // Can cancel from draft
    let result = validateTransition("draft", "cancelled", ctx);
    expect(result.valid).toBe(true);

    // Can cancel from negotiation
    result = validateTransition("negotiation", "cancelled", ctx);
    expect(result.valid).toBe(true);
  });
});
