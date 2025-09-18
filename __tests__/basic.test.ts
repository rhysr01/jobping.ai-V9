/**
 * Basic Test to Verify Test Setup
 */

describe('Basic Test Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should work with environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MATCH_USERS_DISABLE_AI).toBe('true');
  });
});
