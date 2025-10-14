/**
 * Tests for User Matching Service
 * Tests user matching orchestration logic
 */

import { UserMatchingService } from '@/services/user-matching.service';
import { createMockSupabaseClient } from '@/__tests__/_setup/mockFactories';

jest.mock('@/Utils/supabase', () => ({
  getSupabaseClient: jest.fn()
}));

jest.mock('@/lib/string-helpers', () => ({
  normalizeStringToArray: jest.fn((arr) => Array.isArray(arr) ? arr : [arr])
}));

describe('UserMatchingService', () => {
  let service: UserMatchingService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);
    
    service = new UserMatchingService();
  });

  describe('getActiveUsers', () => {
    it('should fetch active verified users', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', email_verified: true },
        { id: '2', email: 'user2@test.com', email_verified: true }
      ];
      mockSupabase.limit.mockReturnValue({ data: mockUsers, error: null });

      const result = await service.getActiveUsers(10);

      expect(result).toEqual(mockUsers);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('email_verified', true);
    });

    it('should handle database errors', async () => {
      mockSupabase.limit.mockReturnValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(service.getActiveUsers(10)).rejects.toThrow();
    });

    it('should handle empty results', async () => {
      mockSupabase.limit.mockReturnValue({ data: [], error: null });

      const result = await service.getActiveUsers(10);

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      mockSupabase.limit.mockReturnValue({ data: [], error: null });

      await service.getActiveUsers(50);

      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('transformUsers', () => {
    it('should transform user data', () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@test.com',
          target_cities: 'London, Berlin',
          languages_spoken: 'English',
          company_types: 'Tech',
          roles_selected: 'Developer',
          subscription_active: true
        }
      ];

      const result = service.transformUsers(mockUsers as any);

      expect(result).toHaveLength(1);
      expect(result[0].subscription_tier).toBe('premium');
    });

    it('should handle free tier users', () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@test.com',
          subscription_active: false
        }
      ];

      const result = service.transformUsers(mockUsers as any);

      expect(result[0].subscription_tier).toBe('free');
    });
  });

  describe('getPreviousMatchesForUsers', () => {
    it('should batch fetch matches', async () => {
      const userEmails = ['user1@test.com', 'user2@test.com'];
      const mockMatches = [
        { user_email: 'user1@test.com', job_hash: 'job1' },
        { user_email: 'user2@test.com', job_hash: 'job2' }
      ];
      mockSupabase.in.mockReturnValue({ data: mockMatches, error: null });

      const result = await service.getPreviousMatchesForUsers(userEmails);

      expect(result.get('user1@test.com')).toEqual(new Set(['job1']));
      expect(result.get('user2@test.com')).toEqual(new Set(['job2']));
    });

    it('should handle empty matches', async () => {
      mockSupabase.in.mockReturnValue({ data: [], error: null });

      const result = await service.getPreviousMatchesForUsers(['user@test.com']);

      expect(result.size).toBe(0);
    });
  });

  describe('saveMatches', () => {
    it('should save matches to database', async () => {
      const matches = [
        { user_email: 'user@test.com', job_hash: 'job1', match_score: 90, match_reason: 'Great' }
      ];
      mockSupabase.insert.mockResolvedValue({ error: null });

      await service.saveMatches(matches, { match_algorithm: 'ai' });

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle empty matches', async () => {
      await service.saveMatches([], { match_algorithm: 'ai' });

      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should convert score to 0-1 scale', async () => {
      const matches = [
        { user_email: 'user@test.com', job_hash: 'job1', match_score: 80, match_reason: 'Good' }
      ];
      mockSupabase.insert.mockResolvedValue({ error: null });

      await service.saveMatches(matches, { match_algorithm: 'ai' });

      const callArg = mockSupabase.insert.mock.calls[0][0][0];
      expect(callArg.match_score).toBe(0.8);
    });
  });
});

