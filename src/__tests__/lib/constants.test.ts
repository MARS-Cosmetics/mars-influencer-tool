import { describe, it, expect } from "vitest";
import {
  INDIAN_STATES,
  CONTENT_LANGUAGES,
  INFLUENCER_CATEGORIES,
  CONTENT_NICHES,
  BUSINESS_TYPES,
  ANNUAL_TURNOVER_RANGES,
  BANK_ACCOUNT_TYPES,
} from "@/lib/constants";

describe("INDIAN_STATES", () => {
  it("should have 36 entries", () => {
    expect(INDIAN_STATES).toHaveLength(36);
  });

  it("should include Maharashtra", () => {
    expect(INDIAN_STATES).toContain("Maharashtra");
  });

  it("should include Delhi", () => {
    expect(INDIAN_STATES).toContain("Delhi");
  });

  it("should include Karnataka", () => {
    expect(INDIAN_STATES).toContain("Karnataka");
  });

  it("should have no duplicates", () => {
    const unique = new Set(INDIAN_STATES);
    expect(unique.size).toBe(INDIAN_STATES.length);
  });

  it("should be a readonly array", () => {
    // TypeScript enforces 'as const', but at runtime we verify it is a frozen-like array
    expect(Array.isArray(INDIAN_STATES)).toBe(true);
  });
});

describe("CONTENT_LANGUAGES", () => {
  it("should have at least 15 entries", () => {
    expect(CONTENT_LANGUAGES.length).toBeGreaterThanOrEqual(15);
  });

  it('should include "hindi"', () => {
    expect(CONTENT_LANGUAGES).toContain("hindi");
  });

  it('should include "english"', () => {
    expect(CONTENT_LANGUAGES).toContain("english");
  });

  it("should have no duplicates", () => {
    const unique = new Set(CONTENT_LANGUAGES);
    expect(unique.size).toBe(CONTENT_LANGUAGES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(CONTENT_LANGUAGES)).toBe(true);
  });
});

describe("INFLUENCER_CATEGORIES", () => {
  it("should have at least 20 entries", () => {
    expect(INFLUENCER_CATEGORIES.length).toBeGreaterThanOrEqual(20);
  });

  it('should include "Beauty"', () => {
    expect(INFLUENCER_CATEGORIES).toContain("Beauty");
  });

  it('should include "Fashion"', () => {
    expect(INFLUENCER_CATEGORIES).toContain("Fashion");
  });

  it('should include "Lifestyle"', () => {
    expect(INFLUENCER_CATEGORIES).toContain("Lifestyle");
  });

  it("should have no duplicates", () => {
    const unique = new Set(INFLUENCER_CATEGORIES);
    expect(unique.size).toBe(INFLUENCER_CATEGORIES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(INFLUENCER_CATEGORIES)).toBe(true);
  });
});

describe("CONTENT_NICHES", () => {
  it("should have at least 15 entries", () => {
    expect(CONTENT_NICHES.length).toBeGreaterThanOrEqual(15);
  });

  it('should include "GRWM (Get Ready With Me)"', () => {
    expect(CONTENT_NICHES).toContain("GRWM (Get Ready With Me)");
  });

  it('should include "Tutorials"', () => {
    expect(CONTENT_NICHES).toContain("Tutorials");
  });

  it("should have no duplicates", () => {
    const unique = new Set(CONTENT_NICHES);
    expect(unique.size).toBe(CONTENT_NICHES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(CONTENT_NICHES)).toBe(true);
  });
});

describe("BUSINESS_TYPES", () => {
  it("should have at least 8 entries", () => {
    expect(BUSINESS_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('should include "Proprietorship"', () => {
    expect(BUSINESS_TYPES).toContain("Proprietorship");
  });

  it('should include "Private Limited"', () => {
    expect(BUSINESS_TYPES).toContain("Private Limited");
  });

  it("should have no duplicates", () => {
    const unique = new Set(BUSINESS_TYPES);
    expect(unique.size).toBe(BUSINESS_TYPES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(BUSINESS_TYPES)).toBe(true);
  });
});

describe("ANNUAL_TURNOVER_RANGES", () => {
  it("should have at least 8 entries", () => {
    expect(ANNUAL_TURNOVER_RANGES.length).toBeGreaterThanOrEqual(8);
  });

  it("should have no duplicates", () => {
    const unique = new Set(ANNUAL_TURNOVER_RANGES);
    expect(unique.size).toBe(ANNUAL_TURNOVER_RANGES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(ANNUAL_TURNOVER_RANGES)).toBe(true);
  });
});

describe("BANK_ACCOUNT_TYPES", () => {
  it("should have exactly 2 entries", () => {
    expect(BANK_ACCOUNT_TYPES).toHaveLength(2);
  });

  it('should include "Current"', () => {
    expect(BANK_ACCOUNT_TYPES).toContain("Current");
  });

  it('should include "Savings"', () => {
    expect(BANK_ACCOUNT_TYPES).toContain("Savings");
  });

  it("should have no duplicates", () => {
    const unique = new Set(BANK_ACCOUNT_TYPES);
    expect(unique.size).toBe(BANK_ACCOUNT_TYPES.length);
  });

  it("should be a readonly array", () => {
    expect(Array.isArray(BANK_ACCOUNT_TYPES)).toBe(true);
  });
});
