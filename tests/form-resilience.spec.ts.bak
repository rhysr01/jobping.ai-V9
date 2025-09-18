import { test, expect } from '@playwright/test';

test.describe('Form Resilience Tests', () => {
  test('should show fallback form when Tally fails', async ({ page }) => {
    await page.route('**/tally.so/**', r => r.abort());
    await page.route('**/api/subscribe', r => r.fulfill({ status: 200, body: 'OK' }));
    await page.goto('/');
    
    // Wait for iframe to fail and fallback to appear
    await page.waitForSelector('[data-testid="fallback-form"]', { timeout: 5000 });
    
    // Fill out fallback form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.selectOption('[data-testid="plan-select"]', 'free');
    
    // Submit form
    await page.click('[data-testid="submit-button"]');
    
    // Verify submission (mock API response)
    await page.waitForResponse(res => res.url().includes('/api/subscribe') && res.status() === 200);
    await expect(page.getByText(/thanks|success/i)).toBeVisible(); // or your success text
  });

  test('should handle form validation', async ({ page }) => {
    await page.route('**/tally.so/**', route => route.abort());
    await page.goto('/');
    
    await page.waitForSelector('[data-testid="fallback-form"]');
    
    // Try to submit without required fields
    await page.click('[data-testid="submit-button"]');
    
    // Should show validation errors
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
  });
});
