import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Schema Constraint Regression Tests
 *
 * These tests parse the Prisma schema file as text to verify that
 * critical constraints are (or are not) present. This prevents
 * accidental re-introduction of constraints that caused bugs.
 */

const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
let schemaSource: string;

beforeAll(() => {
  schemaSource = fs.readFileSync(schemaPath, 'utf-8');
});

// ============================================================
// Helper: extract a model block from the schema
// ============================================================

function extractModelBlock(modelName: string): string {
  // Match from `model <Name> {` to the closing `}`
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
  const match = schemaSource.match(regex);
  if (!match) {
    throw new Error(`Model "${modelName}" not found in schema`);
  }
  return match[1];
}

// ============================================================
// Product Model
// ============================================================

describe('Product Model Schema Constraints (regression)', () => {
  let productBlock: string;

  beforeAll(() => {
    productBlock = extractModelBlock('Product');
  });

  it('should NOT have a @unique constraint on sku', () => {
    // Find the sku line
    const skuLine = productBlock.split('\n').find((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('sku') && !trimmed.startsWith('//');
    });

    expect(skuLine).toBeDefined();
    expect(skuLine).not.toContain('@unique');
  });

  it('should NOT have a @@unique constraint that includes sku', () => {
    // Check for @@unique([...sku...]) at model level
    const uniqueConstraints = productBlock
      .split('\n')
      .filter((line) => line.trim().startsWith('@@unique'));

    for (const constraint of uniqueConstraints) {
      expect(constraint).not.toContain('sku');
    }
  });

  it('should have shopifyVariantId as a field', () => {
    expect(productBlock).toMatch(/shopifyVariantId\s/);
  });

  it('should have shopifyProductId as a field', () => {
    expect(productBlock).toMatch(/shopifyProductId\s/);
  });

  it('should have shopifyInventoryItemId as a field', () => {
    expect(productBlock).toMatch(/shopifyInventoryItemId\s/);
  });

  it('should have sku as an optional field (String?)', () => {
    const skuLine = productBlock.split('\n').find((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('sku') && !trimmed.startsWith('//');
    });

    expect(skuLine).toBeDefined();
    expect(skuLine).toContain('String?');
  });
});

// ============================================================
// SyncLog Model
// ============================================================

describe('SyncLog Model Schema Constraints (regression)', () => {
  let syncLogBlock: string;

  beforeAll(() => {
    syncLogBlock = extractModelBlock('SyncLog');
  });

  it('should have syncType field', () => {
    expect(syncLogBlock).toMatch(/syncType\s/);
  });

  it('should have status field', () => {
    expect(syncLogBlock).toMatch(/status\s/);
  });

  it('should have startedAt field', () => {
    expect(syncLogBlock).toMatch(/startedAt\s/);
  });

  it('should have optional errorMessage field', () => {
    const line = syncLogBlock.split('\n').find((l) => l.trim().startsWith('errorMessage'));
    expect(line).toBeDefined();
    expect(line).toContain('String?');
  });

  it('should have optional itemsProcessed field', () => {
    const line = syncLogBlock.split('\n').find((l) => l.trim().startsWith('itemsProcessed'));
    expect(line).toBeDefined();
    expect(line).toContain('Int?');
  });

  it('should have optional itemsCreated field', () => {
    const line = syncLogBlock.split('\n').find((l) => l.trim().startsWith('itemsCreated'));
    expect(line).toBeDefined();
    expect(line).toContain('Int?');
  });

  it('should have optional itemsUpdated field', () => {
    const line = syncLogBlock.split('\n').find((l) => l.trim().startsWith('itemsUpdated'));
    expect(line).toBeDefined();
    expect(line).toContain('Int?');
  });

  it('should have optional itemsFailed field', () => {
    const line = syncLogBlock.split('\n').find((l) => l.trim().startsWith('itemsFailed'));
    expect(line).toBeDefined();
    expect(line).toContain('Int?');
  });
});
