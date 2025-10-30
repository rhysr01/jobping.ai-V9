import { GET, POST } from '@/app/api/verify-email/route';
import { NextRequest } from 'next/server';
import { errorResponse } from '@/Utils/errorResponse';

jest.mock('@/Utils/errorResponse', () => ({
  errorResponse: {
    badRequest: jest.fn((req, msg) => 
      new Response(JSON.stringify({ error: msg }), { status: 400 })
    ),
    internal: jest.fn((req, msg) => 
      new Response(JSON.stringify({ error: msg }), { status: 500 })
    ),
  },
}));

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}));

jest.mock('@/Utils/productionRateLimiter', () => ({
  getProductionRateLimiter: jest.fn(() => ({
    middleware: jest.fn(() => null),
  })),
}));

jest.mock('@/Utils/constants', () => ({
  ENV: {
    isTest: jest.fn(() => true),
  },
}));

describe('GET /api/verify-email', () => {
  it('should return endpoint info', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('method');
    expect(data.method).toBe('POST');
  });

  it('should indicate test mode', async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toHaveProperty('testMode');
  });
});

describe('POST /api/verify-email', () => {
  it('should require token', async () => {
    const req = {
      json: async () => ({}),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should handle token verification', async () => {
    const req = {
      json: async () => ({ token: 'test-token' }),
    } as NextRequest;

    const response = await POST(req);
    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  it('should return error response on failure', async () => {
    const req = {
      json: async () => ({ token: 'invalid' }),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

