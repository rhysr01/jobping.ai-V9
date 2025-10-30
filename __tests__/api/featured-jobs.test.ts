import { GET } from '@/app/api/featured-jobs/route';
import { getDatabaseClient } from '@/Utils/databasePool';

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [
                {
                  job_hash: 'hash1',
                  title: 'Software Engineer',
                  company: 'Tech Co',
                  location: 'London',
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe('GET /api/featured-jobs', () => {
  it('should return featured jobs', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(Array.isArray(data) || typeof data === 'object').toBe(true);
  });

  it('should query database for jobs', async () => {
    await GET();
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});

