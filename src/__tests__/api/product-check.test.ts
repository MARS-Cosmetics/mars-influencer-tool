import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';

// Business logic for checking if a product has already been sent to an influencer.
// This checks both collaborations (via CollaborationProduct) and PR parcels.

interface DuplicateCheckParams {
  productId: string;
  influencerId: string;
}

async function checkProductAlreadySent(
  params: DuplicateCheckParams
): Promise<{ alreadySent: boolean; sentVia: string | null }> {
  const { productId, influencerId } = params;

  // Check collaborations that include this product for this influencer
  const existingCollaboration = await prismaMock.collaboration.findMany({
    where: {
      influencerId,
      products: {
        some: { productId },
      },
    },
  });

  if (existingCollaboration.length > 0) {
    return { alreadySent: true, sentVia: 'collaboration' };
  }

  // Check PR parcels
  const existingParcel = await prismaMock.prParcel.findMany({
    where: {
      influencerId,
      products: {
        some: { productId },
      },
    },
  });

  if (existingParcel.length > 0) {
    return { alreadySent: true, sentVia: 'pr_parcel' };
  }

  return { alreadySent: false, sentVia: null };
}

describe('Product Duplicate Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect duplicate when same product was sent to same influencer via collaboration', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([
      {
        id: 'collab-1',
        influencerId: 'inf-1',
        products: [{ productId: 'prod-1', quantity: 1 }],
      },
    ]);
    prismaMock.prParcel.findMany.mockResolvedValue([]);

    const result = await checkProductAlreadySent({
      productId: 'prod-1',
      influencerId: 'inf-1',
    });

    expect(result.alreadySent).toBe(true);
    expect(result.sentVia).toBe('collaboration');

    expect(prismaMock.collaboration.findMany).toHaveBeenCalledWith({
      where: {
        influencerId: 'inf-1',
        products: {
          some: { productId: 'prod-1' },
        },
      },
    });
  });

  it('should detect duplicate when same product was sent via PR parcel', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([]);
    prismaMock.prParcel.findMany.mockResolvedValue([
      {
        id: 'parcel-1',
        influencerId: 'inf-1',
        products: [{ productId: 'prod-2', quantity: 2 }],
      },
    ]);

    const result = await checkProductAlreadySent({
      productId: 'prod-2',
      influencerId: 'inf-1',
    });

    expect(result.alreadySent).toBe(true);
    expect(result.sentVia).toBe('pr_parcel');

    expect(prismaMock.prParcel.findMany).toHaveBeenCalledWith({
      where: {
        influencerId: 'inf-1',
        products: {
          some: { productId: 'prod-2' },
        },
      },
    });
  });

  it('should not flag when product is new for that influencer', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([]);
    prismaMock.prParcel.findMany.mockResolvedValue([]);

    const result = await checkProductAlreadySent({
      productId: 'prod-new',
      influencerId: 'inf-1',
    });

    expect(result.alreadySent).toBe(false);
    expect(result.sentVia).toBeNull();
  });

  it('should check both collaborations and PR parcels', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([]);
    prismaMock.prParcel.findMany.mockResolvedValue([]);

    await checkProductAlreadySent({
      productId: 'prod-x',
      influencerId: 'inf-x',
    });

    // Both should have been called
    expect(prismaMock.collaboration.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.prParcel.findMany).toHaveBeenCalledTimes(1);
  });

  it('should short-circuit and not check PR parcels if collaboration match found', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([
      { id: 'collab-existing' },
    ]);

    const result = await checkProductAlreadySent({
      productId: 'prod-1',
      influencerId: 'inf-1',
    });

    expect(result.alreadySent).toBe(true);
    expect(result.sentVia).toBe('collaboration');

    // PR parcel check should NOT have been called since collaboration already matched
    expect(prismaMock.prParcel.findMany).not.toHaveBeenCalled();
  });

  it('should prioritize collaboration over PR parcel when both match', async () => {
    prismaMock.collaboration.findMany.mockResolvedValue([
      { id: 'collab-1' },
    ]);
    // PR parcel would also match, but we short-circuit
    prismaMock.prParcel.findMany.mockResolvedValue([
      { id: 'parcel-1' },
    ]);

    const result = await checkProductAlreadySent({
      productId: 'prod-1',
      influencerId: 'inf-1',
    });

    expect(result.sentVia).toBe('collaboration');
  });

  it('should handle different influencers for the same product independently', async () => {
    // Product was sent to inf-1 but not inf-2
    prismaMock.collaboration.findMany.mockImplementation(
      async ({ where }: { where: { influencerId: string } }) => {
        if (where.influencerId === 'inf-1') {
          return [{ id: 'collab-1' }];
        }
        return [];
      }
    );
    prismaMock.prParcel.findMany.mockResolvedValue([]);

    const result1 = await checkProductAlreadySent({
      productId: 'prod-1',
      influencerId: 'inf-1',
    });
    expect(result1.alreadySent).toBe(true);

    const result2 = await checkProductAlreadySent({
      productId: 'prod-1',
      influencerId: 'inf-2',
    });
    expect(result2.alreadySent).toBe(false);
  });
});
