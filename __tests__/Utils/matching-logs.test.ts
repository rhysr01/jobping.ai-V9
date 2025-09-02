import { logMatchSession } from '../../Utils/jobMatching';

// Mock Supabase client
let mockSupabase: any;

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('Matching Logs System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      }))
    };
    
    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logMatchSession', () => {
    it('should log successful AI matching session with all details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logMatchSession(
        'test@example.com',
        'ai_success',
        50,
        15,
        undefined,
        {
          processingTimeMs: 1250,
          aiModelUsed: 'gpt-4',
          cacheHit: false,
          userTier: 'premium',
          jobFreshnessDistribution: { ultra_fresh: 20, fresh: 25, comprehensive: 5 },
          batchId: 'test_batch_001'
        }
      );

      // Check that Supabase was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('match_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_email: 'test@example.com',
        job_batch_id: 'test_batch_001',
        success: true,
        fallback_used: false,
        jobs_processed: 50,
        matches_generated: 15,
        error_message: undefined,
        match_type: 'ai_success',
        timestamp: expect.any(String),
        processing_time_ms: 1250,
        ai_model_used: 'gpt-4',
        cache_hit: false,
        user_tier: 'premium',
        job_freshness_distribution: { ultra_fresh: 20, fresh: 25, comprehensive: 5 }
      });

      // Check console logging
      expect(consoleSpy).toHaveBeenCalledWith('✅ Logged ai_success session for test@example.com (premium) in 1250ms');
      expect(consoleSpy).toHaveBeenCalledWith('   📊 Jobs: 50 → Matches: 15');
      expect(consoleSpy).toHaveBeenCalledWith('   🆕 Freshness: {"ultra_fresh":20,"fresh":25,"comprehensive":5}');

      consoleSpy.mockRestore();
    });

    it('should log fallback matching session', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logMatchSession(
        'user@example.com',
        'fallback',
        45,
        12,
        undefined,
        {
          processingTimeMs: 800,
          userTier: 'free',
          jobFreshnessDistribution: { fresh: 30, comprehensive: 15 }
        }
      );

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'user@example.com',
          success: false,
          fallback_used: true,
          match_type: 'fallback',
          user_tier: 'free'
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Logged fallback session for user@example.com (free) in 800ms');
      expect(consoleSpy).toHaveBeenCalledWith('   📊 Jobs: 45 → Matches: 12');
      expect(consoleSpy).toHaveBeenCalledWith('   🆕 Freshness: {"fresh":30,"comprehensive":15}');

      consoleSpy.mockRestore();
    });

    it('should log AI failure with error message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logMatchSession(
        'error@example.com',
        'ai_failed',
        30,
        0,
        'OpenAI API rate limit exceeded',
        {
          processingTimeMs: 5000,
          aiModelUsed: 'gpt-4',
          userTier: 'free'
        }
      );

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'error@example.com',
          success: false,
          fallback_used: true,
          match_type: 'ai_failed',
          error_message: 'OpenAI API rate limit exceeded',
          processing_time_ms: 5000
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith('❌ Logged ai_failed session for test@example.com (free) in 5000ms');
      expect(consoleSpy).toHaveBeenCalledWith('   📊 Jobs: 30 → Matches: 0');
      expect(consoleSpy).toHaveBeenCalledWith('   ⚠️  Error: OpenAI API rate limit exceeded');

      consoleSpy.mockRestore();
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await logMatchSession('test@example.com', 'ai_success', 10, 5);
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to log match session:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle Supabase insert errors gracefully', async () => {
      // Mock Supabase to return an error
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ error: { message: 'Database connection failed' } }))
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await logMatchSession('test@example.com', 'ai_success', 10, 5);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to insert match log:', { message: 'Database connection failed' });
      
      consoleSpy.mockRestore();
    });

    it('should generate batch ID if not provided', async () => {
      const beforeTime = Date.now();
      
      await logMatchSession('test@example.com', 'ai_success', 10, 5);
      
      const afterTime = Date.now();
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          job_batch_id: expect.stringMatching(/^batch_\d+$/)
        })
      );
      
      // Verify the batch ID timestamp is within reasonable range
      const batchId = mockSupabase.from().insert.mock.calls[0][0].job_batch_id;
      const timestamp = parseInt(batchId.replace('batch_', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle missing optional parameters gracefully', async () => {
      await logMatchSession('test@example.com', 'ai_success', 10, 5);
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          processing_time_ms: expect.any(Number),
          ai_model_used: null,
          cache_hit: false,
          user_tier: 'unknown',
          job_freshness_distribution: null
        })
      );
    });
  });

  describe('Integration with matching pipeline', () => {
    it('should log different match types correctly', async () => {
      const testCases = [
        {
          type: 'ai_success' as const,
          expectedSuccess: true,
          expectedFallback: false,
          expectedEmoji: '✅'
        },
        {
          type: 'ai_failed' as const,
          expectedSuccess: false,
          expectedFallback: true,
          expectedEmoji: '❌'
        },
        {
          type: 'fallback' as const,
          expectedSuccess: false,
          expectedFallback: true,
          expectedEmoji: '🔄'
        }
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockSupabase = {
          from: jest.fn(() => ({
            insert: jest.fn(() => Promise.resolve({ error: null }))
          }))
        };
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await logMatchSession(
          'test@example.com',
          testCase.type,
          20,
          8,
          testCase.type === 'ai_failed' ? 'Test error' : undefined
        );

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            success: testCase.expectedSuccess,
            fallback_used: testCase.expectedFallback,
            match_type: testCase.type
          })
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(testCase.expectedEmoji)
        );

        consoleSpy.mockRestore();
      }
    });
  });
});
