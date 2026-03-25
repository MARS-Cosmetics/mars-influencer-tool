import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../mocks/prisma';
import { checkIfViral, calculateEarnedMediaValue } from '@/lib/viral-detection';
import type { BaselineMetrics } from '@/lib/viral-detection';

describe('Viral Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateEarnedMediaValue', () => {
    it('should calculate EMV with known inputs', () => {
      const asset = {
        views: 1000,
        likes: 100,
        comments: 10,
        shares: 5,
        saves: 20,
      };

      const emv = calculateEarnedMediaValue(asset);

      // views * 0.05 + likes * 0.5 + comments * 2 + shares * 3 + saves * 1.5
      // 1000*0.05 + 100*0.5 + 10*2 + 5*3 + 20*1.5
      // 50 + 50 + 20 + 15 + 30 = 165
      expect(emv).toBe(165);
    });

    it('should return 0 for all zeros', () => {
      const asset = {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };

      expect(calculateEarnedMediaValue(asset)).toBe(0);
    });

    it('should handle null values as zero', () => {
      const asset = {
        views: null,
        likes: null,
        comments: null,
        shares: null,
        saves: null,
      };

      expect(calculateEarnedMediaValue(asset)).toBe(0);
    });

    it('should handle mixed null and numeric values', () => {
      const asset = {
        views: 2000,
        likes: null,
        comments: 50,
        shares: null,
        saves: 10,
      };

      // 2000*0.05 + 0 + 50*2 + 0 + 10*1.5
      // 100 + 0 + 100 + 0 + 15 = 215
      expect(calculateEarnedMediaValue(asset)).toBe(215);
    });

    it('should scale linearly with views', () => {
      const base = { views: 1000, likes: 0, comments: 0, shares: 0, saves: 0 };
      const doubled = { views: 2000, likes: 0, comments: 0, shares: 0, saves: 0 };

      expect(calculateEarnedMediaValue(doubled)).toBe(
        calculateEarnedMediaValue(base) * 2
      );
    });

    it('should weight shares higher than likes', () => {
      const likesOnly = { views: 0, likes: 100, comments: 0, shares: 0, saves: 0 };
      const sharesOnly = { views: 0, likes: 0, comments: 0, shares: 100, saves: 0 };

      // likes: 100*0.5 = 50, shares: 100*3 = 300
      expect(calculateEarnedMediaValue(sharesOnly)).toBeGreaterThan(
        calculateEarnedMediaValue(likesOnly)
      );
    });
  });

  describe('checkIfViral', () => {
    const defaultBaseline: BaselineMetrics = {
      avgViews: 1000,
      avgLikes: 100,
      avgComments: 20,
      avgShares: 10,
      avgSaves: 15,
      sampleSize: 20,
    };

    it('should detect viral when views are 4x baseline (threshold is 3x)', () => {
      const asset = {
        views: 4000, // 4x the baseline avgViews of 1000
        likes: 100,
        comments: 20,
        shares: 10,
        saves: 15,
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(true);
      expect(result.triggeredBy).toContain('views');
      expect(result.viralMultiplier).toBeGreaterThanOrEqual(4);
    });

    it('should NOT detect viral when views are 2x baseline (below 3x threshold)', () => {
      const asset = {
        views: 2000, // 2x the baseline, below 3x threshold
        likes: 100,
        comments: 20,
        shares: 10,
        saves: 15,
      };

      const result = checkIfViral(asset, defaultBaseline);

      // views are 2x (below 3x threshold)
      // likes, comments, shares, saves are all at 1x
      expect(result.isViral).toBe(false);
      expect(result.triggeredBy).toHaveLength(0);
    });

    it('should detect viral when shares are 6x baseline (threshold is 5x)', () => {
      const asset = {
        views: 1000,
        likes: 100,
        comments: 20,
        shares: 60, // 6x the baseline avgShares of 10
        saves: 15,
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(true);
      expect(result.triggeredBy).toContain('shares');
    });

    it('should NOT detect viral when shares are 4x baseline (below 5x threshold)', () => {
      const asset = {
        views: 1000,
        likes: 100,
        comments: 20,
        shares: 40, // 4x, below 5x threshold
        saves: 15,
      };

      const result = checkIfViral(asset, defaultBaseline);

      // No metric exceeds its threshold
      expect(result.triggeredBy).not.toContain('shares');
    });

    it('should detect viral when saves are 5x baseline (threshold is 5x)', () => {
      const asset = {
        views: 1000,
        likes: 100,
        comments: 20,
        shares: 10,
        saves: 75, // 5x the baseline avgSaves of 15
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(true);
      expect(result.triggeredBy).toContain('saves');
    });

    it('should handle empty baseline (sampleSize 0) without crashing', () => {
      const emptyBaseline: BaselineMetrics = {
        avgViews: 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        avgSaves: 0,
        sampleSize: 0,
      };

      const asset = {
        views: 100000,
        likes: 50000,
        comments: 5000,
        shares: 10000,
        saves: 20000,
      };

      const result = checkIfViral(asset, emptyBaseline);

      expect(result.isViral).toBe(false);
      expect(result.viralMultiplier).toBe(0);
      expect(result.triggeredBy).toHaveLength(0);
    });

    it('should calculate correct viralMultiplier as average of triggered multipliers', () => {
      const asset = {
        views: 3000, // 3x (exactly at threshold)
        likes: 600, // 6x (above 3x threshold)
        comments: 20,
        shares: 10,
        saves: 15,
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(true);
      expect(result.triggeredBy).toContain('views');
      expect(result.triggeredBy).toContain('likes');

      // Multipliers: views=3, likes=6 => average = 4.5
      expect(result.viralMultiplier).toBe(4.5);
    });

    it('should report multiple triggers when several metrics exceed thresholds', () => {
      const asset = {
        views: 5000, // 5x
        likes: 500, // 5x
        comments: 100, // 5x
        shares: 60, // 6x
        saves: 90, // 6x
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(true);
      expect(result.triggeredBy).toContain('views');
      expect(result.triggeredBy).toContain('likes');
      expect(result.triggeredBy).toContain('comments');
      expect(result.triggeredBy).toContain('shares');
      expect(result.triggeredBy).toContain('saves');
      expect(result.triggeredBy).toHaveLength(5);
    });

    it('should handle null metric values gracefully', () => {
      const asset = {
        views: null,
        likes: null,
        comments: null,
        shares: null,
        saves: null,
      };

      const result = checkIfViral(asset, defaultBaseline);

      expect(result.isViral).toBe(false);
      expect(result.triggeredBy).toHaveLength(0);
    });

    it('should not trigger viral when baseline average is 0 for a metric', () => {
      const zeroViewsBaseline: BaselineMetrics = {
        avgViews: 0,
        avgLikes: 100,
        avgComments: 20,
        avgShares: 10,
        avgSaves: 15,
        sampleSize: 10,
      };

      const asset = {
        views: 100000, // Huge but baseline is 0
        likes: 100,
        comments: 20,
        shares: 10,
        saves: 15,
      };

      const result = checkIfViral(asset, zeroViewsBaseline);

      // Views should not trigger because avgViews is 0, division would be infinity
      expect(result.triggeredBy).not.toContain('views');
    });
  });
});
