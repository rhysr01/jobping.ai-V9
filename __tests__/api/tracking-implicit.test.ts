import { GET } from '@/app/api/tracking/implicit/route';

describe('GET /api/tracking/implicit', () => {
  it('should return tracking response', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return valid response format', async () => {
    const response = await GET();
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});

