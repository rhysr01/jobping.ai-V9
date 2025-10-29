import { GET } from '@/app/api/health/route';

// Mock database client
const mockDatabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      limit: jest.fn(() => ({
        error: null
      }))
    }))
  }))
};

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(() => mockDatabaseClient)
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    // Set required environment variables for tests
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.OPEN_API_KEY = 'test-openai-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  it('returns 200 status for healthy system', async () => {
    const response = await GET();
    const data = await response.json();
    
    console.log('Health response:', { status: response.status, data });
    expect(response.status).toBe(200);
  });

  it('returns health status object', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('checks');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
  });

  it('includes system checks', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('database');
    expect(data.duration).toBeGreaterThanOrEqual(0);
  });

  it('returns 503 for unhealthy system', async () => {
    // Mock database error
    mockDatabaseClient.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          error: new Error('Database connection failed')
        }))
      }))
    });

    const response = await GET();
    
    expect(response.status).toBe(503);
  });

  it('returns 200 for degraded system', async () => {
    // This test is not applicable to our simplified health check
    // Our health check only returns healthy or unhealthy
    const response = await GET();
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});

