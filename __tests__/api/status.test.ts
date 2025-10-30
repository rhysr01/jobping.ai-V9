import { GET } from '@/app/api/status/route';
import { getDatabaseClient } from '@/Utils/databasePool';

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

describe('GET /api/status', () => {
  it('should return status information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('should include system status', async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  it('should check database connection', async () => {
    await GET();
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});

