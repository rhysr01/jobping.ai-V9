import { ENV, isProduction, isDevelopment, isTest } from '@/lib/env';

// Mock the env module to avoid parsing errors in tests
jest.mock('@/lib/env', () => {
  const originalModule = jest.requireActual('@/lib/env');
  return {
    ...originalModule,
    ENV: {
      NODE_ENV: process.env.NODE_ENV || 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key-12345678901234567890',
      OPENAI_API_KEY: 'sk-test123',
      RESEND_API_KEY: 're_test123',
      STRIPE_SECRET_KEY: 'sk_test123',
      INTERNAL_API_HMAC_SECRET: 'test-secret-123456789012345678901234567890',
      SYSTEM_API_KEY: 'test-system-key',
    },
  };
});

describe('env', () => {

