import { test, expect } from '@playwright/test';

test.describe('Share Preview Tests', () => {
  test('should have proper OG and Twitter tags', async ({ page }) => {
    await page.goto('/');
    
    // Check OG image exists
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBe('https://getjobping.com/og-image.png');
    
    // Check Twitter image
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(twitterImage).toBe('https://getjobping.com/og-image.png');
  });

  test('should have rel="noopener noreferrer" on external links', async ({ page }) => {
    await page.goto('/');
    
    const externalLinks = await page.locator('a[href^="http"]').all();
    
    for (const link of externalLinks) {
      const rel = await link.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  test('should have proper link text for screen readers', async ({ page }) => {
    await page.goto('/');
    
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Either has descriptive text or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });
});
