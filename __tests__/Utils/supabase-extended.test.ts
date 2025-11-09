/**
 * Comprehensive tests for Supabase Utilities
 * Tests client creation, configuration
 */

import {
  getSupabaseClient,
  createSupabaseClient
} from '@/Utils/supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

describe('Supabase Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('getSupabaseClient', () => {
    it('should get Supabase client', () => {
      const client = getSupabaseClient();

      expect(client).toBeDefined();
    });

    it('should throw if config missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => {
        getSupabaseClient();
      }).toThrow();
    });
  });

  describe('createSupabaseClient', () => {
    it('should create Supabase client', () => {
      const client = createSupabaseClient('https://test.co', 'test-key');

      expect(client).toBeDefined();
    });
  });
});

