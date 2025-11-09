/**
 * Tests for Matching Logging Service
 * Tests matching operation logging
 */

import { logMatchSession } from '@/Utils/matching/logging.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

describe('Matching Logging Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null })
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('logMatchSession', () => {
    it('should log successful AI matching session', async () => {
      await logMatchSession(
        'user@example.com',
        'ai_success',
        5,
        {
          processingTimeMs: 1500,
          aiModel: 'gpt-4o-mini',
          aiCostUsd: 0.01
        }
      );

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should log failed AI matching session', async () => {
      await logMatchSession(
        'user@example.com',
        'ai_failed',
        0,
        {
          errorMessage: 'AI timeout'
        }
      );

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should log fallback matching session', async () => {
      await logMatchSession(
        'user@example.com',
        'fallback',
        3
      );

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { message: 'DB error' }
      });

      await expect(
        logMatchSession('user@example.com', 'ai_success', 5)
      ).resolves.not.toThrow();
    });
  });
});

