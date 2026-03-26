import { describe, it, expect } from "vitest";

// ============================================================
// Test the leaderboard scoring formula
// Score = (totalViews / avgCPV) * collabCount
// Barter CPV = 0 (contributes 0 to score)
// ============================================================

function calculateScore(
  totalViews: number,
  collabs: Array<{ type: string; agreedAmount: number | null; views: number }>
): { score: number; avgCPV: number; allBarter: boolean } {
  let cpvSum = 0;
  let paidCollabCount = 0;
  let allBarter = true;

  for (const collab of collabs) {
    if (collab.type === "paid" && collab.agreedAmount) {
      allBarter = false;
      if (collab.views > 0) {
        const cpv = collab.agreedAmount / collab.views;
        cpvSum += cpv;
        paidCollabCount++;
      }
    }
  }

  const avgCPV = paidCollabCount > 0 ? cpvSum / paidCollabCount : 0;
  const viewsCpvRatio = avgCPV > 0 ? totalViews / avgCPV : 0;
  const score = viewsCpvRatio * collabs.length;

  return {
    score: Math.round(score * 100) / 100,
    avgCPV: Math.round(avgCPV * 100) / 100,
    allBarter,
  };
}

describe("Leaderboard Scoring Formula", () => {
  it("should calculate score for paid collaborations", () => {
    // 2 paid collabs: ₹10,000 for 100K views, ₹20,000 for 200K views
    // CPV1 = 10000/100000 = 0.1, CPV2 = 20000/200000 = 0.1
    // avgCPV = 0.1
    // totalViews = 300,000
    // Score = (300000 / 0.1) * 2 = 6,000,000
    const result = calculateScore(300000, [
      { type: "paid", agreedAmount: 10000, views: 100000 },
      { type: "paid", agreedAmount: 20000, views: 200000 },
    ]);

    expect(result.score).toBe(6000000);
    expect(result.avgCPV).toBe(0.1);
    expect(result.allBarter).toBe(false);
  });

  it("should return 0 score for all-barter collaborations", () => {
    const result = calculateScore(500000, [
      { type: "barter", agreedAmount: null, views: 200000 },
      { type: "pr_gifting", agreedAmount: null, views: 300000 },
    ]);

    expect(result.score).toBe(0);
    expect(result.avgCPV).toBe(0);
    expect(result.allBarter).toBe(true);
  });

  it("should handle mix of paid and barter collaborations", () => {
    // 1 paid: ₹5,000 for 50,000 views → CPV = 0.1
    // 1 barter: 0 CPV, 100,000 views
    // avgCPV = 0.1 (only from paid)
    // totalViews = 150,000
    // collabCount = 2
    // Score = (150000 / 0.1) * 2 = 3,000,000
    const result = calculateScore(150000, [
      { type: "paid", agreedAmount: 5000, views: 50000 },
      { type: "barter", agreedAmount: null, views: 100000 },
    ]);

    expect(result.score).toBe(3000000);
    expect(result.avgCPV).toBe(0.1);
    expect(result.allBarter).toBe(false);
  });

  it("should handle paid collab with 0 views (skips CPV calculation)", () => {
    const result = calculateScore(0, [
      { type: "paid", agreedAmount: 10000, views: 0 },
    ]);

    // Views=0 means CPV can't be calculated, paidCollabCount stays 0
    expect(result.score).toBe(0);
    expect(result.avgCPV).toBe(0);
  });

  it("should reward higher views with lower CPV (better efficiency)", () => {
    // User A: 500K views, CPV = 0.05 → Score = (500K/0.05)*1 = 10M
    const userA = calculateScore(500000, [
      { type: "paid", agreedAmount: 25000, views: 500000 },
    ]);

    // User B: 500K views, CPV = 0.5 → Score = (500K/0.5)*1 = 1M
    const userB = calculateScore(500000, [
      { type: "paid", agreedAmount: 250000, views: 500000 },
    ]);

    // User A should rank higher (lower CPV = better efficiency)
    expect(userA.score).toBeGreaterThan(userB.score);
  });

  it("should reward more collaborations (multiplier effect)", () => {
    // Same total views and CPV, but more collabs = higher score
    const oneCollab = calculateScore(100000, [
      { type: "paid", agreedAmount: 10000, views: 100000 },
    ]);

    const threeCollabs = calculateScore(100000, [
      { type: "paid", agreedAmount: 3333, views: 33333 },
      { type: "paid", agreedAmount: 3333, views: 33333 },
      { type: "paid", agreedAmount: 3334, views: 33334 },
    ]);

    expect(threeCollabs.score).toBeGreaterThan(oneCollab.score);
  });

  it("should handle single collab correctly", () => {
    // ₹15,000 for 75,000 views → CPV = 0.2
    // Score = (75000 / 0.2) * 1 = 375,000
    const result = calculateScore(75000, [
      { type: "paid", agreedAmount: 15000, views: 75000 },
    ]);

    expect(result.score).toBe(375000);
    expect(result.avgCPV).toBe(0.2);
  });

  it("should handle empty collaborations", () => {
    const result = calculateScore(0, []);
    expect(result.score).toBe(0);
    expect(result.avgCPV).toBe(0);
    expect(result.allBarter).toBe(true);
  });
});

// ============================================================
// Test week boundaries (Monday-Monday)
// ============================================================

function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);

  return { start: monday, end: nextMonday };
}

describe("Week Boundaries (Monday-Monday)", () => {
  it("should return Monday 00:00 to next Monday 00:00", () => {
    // Wednesday March 26, 2026
    const { start, end } = getWeekBoundaries(new Date("2026-03-26T12:00:00Z"));

    expect(start.getUTCDay()).toBe(1); // Monday
    expect(start.getUTCHours()).toBe(0);
    expect(end.getUTCDay()).toBe(1); // Next Monday
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("should handle Sunday correctly (goes back to previous Monday)", () => {
    // Sunday March 29, 2026
    const { start } = getWeekBoundaries(new Date("2026-03-29T12:00:00Z"));

    expect(start.getUTCDay()).toBe(1); // Monday
    expect(start.getUTCDate()).toBe(23); // March 23
  });

  it("should handle Monday correctly (same day)", () => {
    // Monday March 23, 2026
    const { start, end } = getWeekBoundaries(new Date("2026-03-23T15:00:00Z"));

    expect(start.getUTCDay()).toBe(1);
    expect(start.getUTCDate()).toBe(23);
    expect(end.getUTCDate()).toBe(30);
  });

  it("should span exactly 7 days", () => {
    const { start, end } = getWeekBoundaries(new Date("2026-03-25T08:00:00Z"));
    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("a collab approved on Tuesday should be in that week only", () => {
    const approvedDate = new Date("2026-03-24T14:30:00Z"); // Tuesday
    const { start, end } = getWeekBoundaries(approvedDate);

    expect(approvedDate >= start && approvedDate < end).toBe(true);

    // But NOT in the previous week
    const prevWeek = getWeekBoundaries(new Date("2026-03-17T12:00:00Z"));
    expect(approvedDate >= prevWeek.start && approvedDate < prevWeek.end).toBe(false);
  });
});

describe("Month Boundaries", () => {
  function getMonthBoundaries(date: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    return { start, end };
  }

  it("should return first day to first day of next month", () => {
    const { start, end } = getMonthBoundaries(new Date("2026-03-15T12:00:00Z"));
    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(end.getUTCDate()).toBe(1);
    expect(end.getUTCMonth()).toBe(3); // April
  });

  it("should handle December → January boundary", () => {
    const { start, end } = getMonthBoundaries(new Date("2026-12-20T12:00:00Z"));
    expect(start.getUTCMonth()).toBe(11); // December
    expect(end.getUTCMonth()).toBe(0); // January
    expect(end.getUTCFullYear()).toBe(2027);
  });
});
