import { test, expect } from '@playwright/test';

test.describe('SEO Tests', () => {
  test('should have required meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    const title = await page.title();
    expect(title).toBe('JobPing · Five roles. Zero scrolling.');
    
    // Check description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Weekly job matches for early-career roles');
    
    // Check canonical
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://getjobping.com/');
    
    // Check OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBe('JobPing · Five roles. Zero scrolling.');
    
    // OG image is optional for now (will add later)
    // const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    // expect(ogImage).toBeTruthy();
    
    // Check Twitter tags
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary');
  });

  test('should have proper structured data', async ({ page }) => {
    await page.goto('/');
    
    // Check for JSON-LD structured data
    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd).toBeGreaterThan(0);
  });
});
