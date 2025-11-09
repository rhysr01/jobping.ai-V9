/**
 * Comprehensive tests for Match Logging Service
 * Tests session logging, stats retrieval
 */

import { logMatchSession, getMatchSessionStats } from '@/Utils/matching/logging.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

describe('Match Logging Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null })
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('logMatchSession', () => {
    it('should log match session', async () => {
      await logMatchSession(
        'user@example.com',
        'ai_success',
        10,
        { processingTimeMs: 100, aiModel: 'gpt-4', aiCostUsd: 0.05 }
      );

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.insert.mockResolvedValue({
        error: new Error('Insert failed')
      });

      await expect(
        logMatchSession('user@example.com', 'ai_failed', 0)
      ).resolves.not.toThrow();
    });
  });

  describe('getMatchSessionStats', () => {
    it('should get stats for user', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [
          { match_type: 'ai_success', matches_count: 10, ai_cost_usd: 0.05 },
          { match_type: 'ai_success', matches_count: 8, ai_cost_usd: 0.04 },
          { match_type: 'fallback', matches_count: 5, ai_cost_usd: 0 }
        ],
        error: null
      });

      const stats = await getMatchSessionStats('user@example.com');

      expect(stats.totalSessions).toBe(3);
      expect(stats.aiSuccessRate).toBeGreaterThan(0);
      expect(stats.averageMatches).toBeGreaterThan(0);
    });

    it('should filter by time range', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      });

      await getMatchSessionStats(undefined, { start, end });

      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.lte).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: new Error('Query failed')
      });

      const stats = await getMatchSessionStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.aiSuccessRate).toBe(0);
    });
  });
});
