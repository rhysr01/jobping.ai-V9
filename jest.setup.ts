// Jest setup for Node environment (API testing)
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder (required for cheerio and other web APIs)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill for crypto.randomUUID (required for Node.js < 19)
if (!global.crypto) {
  (global as any).crypto = {
    randomUUID: () => require('crypto').randomUUID(),
  };
}

// Polyfill for setImmediate
if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: Function) => setTimeout(fn, 0);
}

// Set test environment
(process.env as any).NODE_ENV = 'test';

// Test-specific environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.MATCH_USERS_DISABLE_AI = 'true';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.NEXT_PUBLIC_URL = 'http://localhost:3000';
process.env.SCRAPE_API_KEY = 'test-api-key';
process.env.BYPASS_RESERVATION = '1';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url: string, options: any = {}) {
      this._url = url;
      this._method = options.method || 'GET';
      this._headers = new Map(Object.entries(options.headers || {}));
      this._body = options.body;
    }
    
    private _url: string;
    private _method: string;
    private _headers: Map<string, string>;
    private _body: string;
    
    get url() {
      return this._url;
    }
    
    get method() {
      return this._method;
    }
    
    get headers() {
      return this._headers;
    }
    
    json() {
      return Promise.resolve(JSON.parse(this._body || '{}'));
    }
  },
  NextResponse: {
    json: jest.fn((data: any, options: any = {}) => ({
      json: () => Promise.resolve(data),
      status: options.status || 200,
      headers: new Map(Object.entries(options.headers || {})),
    })),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// OpenAI bypassed in tests via MATCH_USERS_DISABLE_AI=true

// Mock Redis (no-op in test mode)
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isOpen: true,
    on: jest.fn(),
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve('OK')),
    del: jest.fn(() => Promise.resolve(1)),
    zAdd: jest.fn(() => Promise.resolve(1)),
    zCard: jest.fn(() => Promise.resolve(0)),
    zRemRangeByScore: jest.fn(() => Promise.resolve(0)),
  })),
}));

// Mock ProductionRateLimiter (exists)
jest.mock('@/Utils/productionRateLimiter', () => ({
  getProductionRateLimiter: jest.fn(() => ({
    checkLimit: jest.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
    teardown: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock Resend (no-op in test mode)
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn(() => Promise.resolve({ id: 'test-id' })),
    },
  })),
}));

// Mock Sentry (no-op in test mode)
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
}));

// EnhancedAIMatchingCache removed - no longer needed

// Global test utilities
global.fetch = jest.fn();

// Silence console methods in tests to reduce noise
const originalConsole = { ...console };
global.console = {
  ...console,
  log: console.log, // Keep console.log for debugging
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Restore console for debugging if needed
(global as any).__restoreConsole = () => {
  global.console = originalConsole;
};

// Import teardown functions
import { getProductionRateLimiter } from './Utils/productionRateLimiter';

// Global teardown to close all connections
afterAll(async () => {
  console.log(' Cleaning up test resources...');
  
  try {
    // Teardown rate limiter
    await getProductionRateLimiter().teardown();
    
    
    // Cache teardown is handled by mocks
    
    console.log(' Test cleanup completed');
  } catch (error) {
    console.error(' Error during test cleanup:', error);
  }
});