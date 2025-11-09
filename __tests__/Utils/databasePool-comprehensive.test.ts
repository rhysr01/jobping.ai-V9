/**
 * Comprehensive tests for Database Pool
 * Tests singleton pattern, health checks, connection management
 */

import {
  getDatabaseClient,
  closeDatabasePool,
  getDatabasePoolStatus
} from '@/Utils/databasePool';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn()
}));

describe('Database Pool', () => {
  let mockCreateClient: any;
  let mockSupabaseInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    mockSupabaseInstance = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [], error: null })
    };

    const { createClient } = require('@supabase/supabase-js');
    mockCreateClient = createClient;
    mockCreateClient.mockReturnValue(mockSupabaseInstance);
  });

  describe('getDatabaseClient', () => {
    it('should return singleton instance', () => {
      const client1 = getDatabaseClient();
      const client2 = getDatabaseClient();

      expect(client1).toBe(client2);
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should initialize with correct config', () => {
      getDatabaseClient();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false
          })
        })
      );
    });

    it('should throw error if config missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => {
        getDatabaseClient();
      }).toThrow('Missing Supabase configuration');
    });
  });

  describe('Health Checks', () => {
    it('should perform health check on initialization', async () => {
      getDatabaseClient();

      // Wait for async health check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabaseInstance.from).toHaveBeenCalledWith('jobs');
    });

    it('should handle health check errors', async () => {
      mockSupabaseInstance.select.mockResolvedValue({
        data: null,
        error: new Error('Health check failed')
      });

      getDatabaseClient();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabaseInstance.from).toHaveBeenCalled();
    });
  });

  describe('closeDatabasePool', () => {
    it('should close database pool', async () => {
      getDatabaseClient();

      await closeDatabasePool();

      const client = getDatabaseClient();
      // Should create new instance after close
      expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDatabasePoolStatus', () => {
    it('should return pool status', () => {
      getDatabaseClient();

      const status = getDatabasePoolStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isHealthy).toBeDefined();
      expect(status.lastHealthCheck).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle SIGTERM', async () => {
      const originalListeners = process.listeners('SIGTERM');
      
      // Re-import to register handlers
      jest.resetModules();
      require('@/Utils/databasePool');

      const sigtermListeners = process.listeners('SIGTERM');
      expect(sigtermListeners.length).toBeGreaterThan(originalListeners.length);

      // Restore
      process.removeAllListeners('SIGTERM');
      originalListeners.forEach(listener => {
        process.on('SIGTERM', listener as any);
      });
    });

    it('should handle SIGINT', async () => {
      const originalListeners = process.listeners('SIGINT');
      
      // Re-import to register handlers
      jest.resetModules();
      require('@/Utils/databasePool');

      const sigintListeners = process.listeners('SIGINT');
      expect(sigintListeners.length).toBeGreaterThan(originalListeners.length);

      // Restore
      process.removeAllListeners('SIGINT');
      originalListeners.forEach(listener => {
        process.on('SIGINT', listener as any);
      });
    });
  });

  describe('Error Handling', () => {
    it('should capture exceptions on initialization failure', () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Init failed');
      });

      expect(() => {
        getDatabaseClient();
      }).toThrow();

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});

