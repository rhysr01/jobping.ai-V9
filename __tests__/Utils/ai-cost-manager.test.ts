/**
 * Tests for AI Cost Management System
 */

import { AICostManager } from '@/Utils/ai-cost-manager';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

describe('AICostManager', () => {
  let costManager: AICostManager;
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      data: null,
      error: null
    };

    require('@supabase/supabase-js').createClient.mockReturnValue(mockSupabaseClient);
    
    // Set default environment variables
    process.env.AI_MAX_DAILY_COST = '15';
    process.env.AI_MAX_CALLS_PER_USER = '5';
    process.env.AI_MAX_CALLS_PER_DAY = '200';
    process.env.AI_EMERGENCY_STOP = '20';
    
    costManager = new AICostManager();
  });

  describe('constructor', () => {
    it('should initialize with default limits', () => {
      expect(costManager).toBeDefined();
    });

    it('should use environment variables for limits', () => {
      process.env.AI_MAX_DAILY_COST = '25';
      process.env.AI_MAX_CALLS_PER_USER = '10';
      process.env.AI_MAX_CALLS_PER_DAY = '500';
      process.env.AI_EMERGENCY_STOP = '30';

      const customCostManager = new AICostManager();
      expect(customCostManager).toBeDefined();
    });

    it('should handle missing environment variables', () => {
      delete process.env.AI_MAX_DAILY_COST;
      delete process.env.AI_MAX_CALLS_PER_USER;
      delete process.env.AI_MAX_CALLS_PER_DAY;
      delete process.env.AI_EMERGENCY_STOP;

      const defaultCostManager = new AICostManager();
      expect(defaultCostManager).toBeDefined();
    });
  });

  describe('canMakeAICall', () => {
    it('should allow AI call when under limits', async () => {
      // Mock the query that loadDailyMetrics uses
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: [{ cost_usd: 5, user_email: 'user123' }], 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block AI call when daily cost limit exceeded', async () => {
      // Mock the entire query chain that loadDailyMetrics uses
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: [{ cost_usd: 14.99, user_email: 'user123' }], 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.02);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily cost limit');
    });

    it('should block AI call when daily calls limit exceeded', async () => {
      // Mock the query that loadDailyMetrics uses - create 250 calls worth of data
      const mockData = Array(250).fill(null).map((_, i) => ({ 
        cost_usd: 0.01, 
        user_email: `user${i}` 
      }));
      
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: mockData, 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily call limit');
    });

    it('should block AI call when user calls limit exceeded', async () => {
      // Mock the query that loadDailyMetrics uses - create 5 calls for user123
      const mockData = Array(5).fill(null).map(() => ({ 
        cost_usd: 0.01, 
        user_email: 'user123' 
      }));
      
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: mockData, 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User call limit');
    });

    it('should handle emergency stop threshold', async () => {
      // Mock the query that loadDailyMetrics uses - create data with cost > emergency threshold
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: [{ cost_usd: 25, user_email: 'user123' }], 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Emergency cost limit');
    });

    it('should handle database errors gracefully', async () => {
      // Mock the query that loadDailyMetrics uses - simulate database error
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(true); // Should allow when database fails
      expect(result.reason).toBeUndefined(); // No reason when allowed
    });

    it('should handle missing cost data', async () => {
      // Mock the query that loadDailyMetrics uses - simulate no data
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined(); // No reason when allowed
    });
  });

  describe('recordAICall', () => {
    it('should record AI call successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ error: null });

      // recordAICall returns void, so we just check it doesn't throw
      await expect(costManager.recordAICall('user123', 'gpt-4o-mini', 0.01, 100)).resolves.not.toThrow();
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should handle recording errors', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ 
        error: { message: 'Insert failed' } 
      });

      // recordAICall returns void, so we just check it doesn't throw
      // The method should handle errors gracefully
      await expect(costManager.recordAICall('user123', 'gpt-4o-mini', 0.01, 100)).resolves.not.toThrow();
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should record different AI models', async () => {
      mockSupabaseClient.gte.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });

      await costManager.recordAICall('user123', 'gpt-3.5-turbo', 0.01, 100);
      await costManager.recordAICall('user123', 'gpt-4', 0.15, 200);

      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(2);
    });

    it('should record different costs', async () => {
      mockSupabaseClient.gte.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });

      await costManager.recordAICall('user123', 'gpt-3.5-turbo', 0.01, 100);
      await costManager.recordAICall('user123', 'gpt-3.5-turbo', 0.10, 200);

      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCostMetrics', () => {
    it('should return current cost metrics', async () => {
      // Mock the query that loadDailyMetrics uses
      const mockData = [
        { cost_usd: 5.25, user_email: 'user123' },
        { cost_usd: 5.25, user_email: 'user456' }
      ];

      mockSupabaseClient.gte.mockResolvedValue({ data: mockData, error: null });

      const metrics = await costManager.getCostMetrics();

      expect(metrics.dailyCost).toBe(10.50);
      expect(metrics.dailyCalls).toBe(2);
      expect(metrics.userCalls).toEqual({ user123: 1, user456: 1 });
      expect(metrics.lastReset).toBeDefined();
    });

    it('should handle missing metrics data', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      const metrics = await costManager.getCostMetrics();

      expect(metrics.dailyCost).toBe(0);
      expect(metrics.dailyCalls).toBe(0);
      expect(metrics.userCalls).toEqual({});
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const metrics = await costManager.getCostMetrics();

      expect(metrics.dailyCost).toBe(0);
      expect(metrics.dailyCalls).toBe(0);
      expect(metrics.userCalls).toEqual({});
    });
  });




  describe('edge cases', () => {
    it('should handle missing environment variables', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // The constructor doesn't throw, it just uses undefined values
      expect(() => new AICostManager()).not.toThrow();
    });

    it('should handle invalid cost values', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: { daily_cost: -5, daily_calls: 10 }, 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(true); // Should handle negative costs gracefully
    });

    it('should handle very large cost values', async () => {
      // Mock the query that loadDailyMetrics uses - create data with very large cost
      mockSupabaseClient.gte.mockResolvedValue({ 
        data: [{ cost_usd: 999999, user_email: 'user123' }], 
        error: null 
      });

      const result = await costManager.canMakeAICall('user123', 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Emergency cost limit');
    });

    it('should handle concurrent calls', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: { daily_cost: 5, daily_calls: 10 }, 
        error: null 
      });

      const promises = [
        costManager.canMakeAICall('user123', 0.01),
        costManager.canMakeAICall('user123', 0.01),
        costManager.canMakeAICall('user123', 0.01)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });
  });
});