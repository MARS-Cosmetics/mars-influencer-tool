import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Instagram Client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('USE_MOCK flag', () => {
    it('should be true when no RAPIDAPI_KEY env var is set', async () => {
      const mod = await import('@/lib/instagram');
      expect(mod.USE_MOCK).toBe(true);
    });
  });

  describe('USE_META_API flag', () => {
    it('should be false when no META_APP_ID env var is set', async () => {
      const mod = await import('@/lib/instagram');
      expect(mod.USE_META_API).toBe(false);
    });
  });

  describe('REQUIRED_ENV_VARS', () => {
    it('should list expected env var names', async () => {
      const { REQUIRED_ENV_VARS } = await import('@/lib/instagram');
      expect(REQUIRED_ENV_VARS.rapidApi).toEqual(['RAPIDAPI_KEY']);
      expect(REQUIRED_ENV_VARS.metaApi).toEqual(['META_APP_ID', 'META_APP_SECRET']);
    });
  });

  describe('fetchPublicProfile (mock)', () => {
    it('should return a profile with correct shape', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('beauty_creator');

      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('fullName');
      expect(profile).toHaveProperty('biography');
      expect(profile).toHaveProperty('followerCount');
      expect(profile).toHaveProperty('followingCount');
      expect(profile).toHaveProperty('postCount');
      expect(profile).toHaveProperty('profilePicUrl');
      expect(profile).toHaveProperty('isVerified');
      expect(profile).toHaveProperty('isPrivate');
    });

    it('should return the same username as input', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('test_handle');

      expect(profile.username).toBe('test_handle');
    });

    it('should return numeric follower counts', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('some_influencer');

      expect(typeof profile.followerCount).toBe('number');
      expect(typeof profile.followingCount).toBe('number');
      expect(typeof profile.postCount).toBe('number');
      expect(profile.followerCount).toBeGreaterThanOrEqual(0);
      expect(profile.followingCount).toBeGreaterThanOrEqual(0);
      expect(profile.postCount).toBeGreaterThanOrEqual(0);
    });

    it('should return boolean flags for isVerified and isPrivate', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('creator_xyz');

      expect(typeof profile.isVerified).toBe('boolean');
      expect(typeof profile.isPrivate).toBe('boolean');
      // Mock profiles are never private
      expect(profile.isPrivate).toBe(false);
    });

    it('should generate a fullName from the handle', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('jane.doe');

      // The mock replaces . and _ with spaces and capitalizes
      expect(profile.fullName).toBe('Jane Doe');
    });

    it('should return a profile picture URL', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('test_user');

      expect(profile.profilePicUrl).not.toBeNull();
      expect(profile.profilePicUrl).toContain('http');
    });

    it('should produce deterministic results for the same handle', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile1 = await fetchPublicProfile('deterministic_test');
      const profile2 = await fetchPublicProfile('deterministic_test');

      expect(profile1.followerCount).toBe(profile2.followerCount);
      expect(profile1.followingCount).toBe(profile2.followingCount);
      expect(profile1.postCount).toBe(profile2.postCount);
      expect(profile1.isVerified).toBe(profile2.isVerified);
    });
  });

  describe('getAuthUrl', () => {
    it('should throw when META_APP_ID is not configured', async () => {
      const { getAuthUrl } = await import('@/lib/instagram');

      expect(() => getAuthUrl('http://localhost:3000/callback')).toThrow(
        'META_APP_ID is not configured'
      );
    });
  });

  describe('InstagramPublicProfile type shape', () => {
    it('should have all required fields', async () => {
      const { fetchPublicProfile } = await import('@/lib/instagram');
      const profile = await fetchPublicProfile('shape_check');

      const requiredFields: (keyof typeof profile)[] = [
        'username',
        'fullName',
        'biography',
        'followerCount',
        'followingCount',
        'postCount',
        'profilePicUrl',
        'isVerified',
        'isPrivate',
      ];

      for (const field of requiredFields) {
        expect(profile).toHaveProperty(field);
      }
    });
  });
});
