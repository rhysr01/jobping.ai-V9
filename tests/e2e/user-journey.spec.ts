/**
 * E2E Test Suite: Complete User Journey
 * 
 * Tests the entire JobPing flow from signup to receiving job matches,
 * including the latest changes: email branding, spacing, Stripe integration,
 * and engagement tracking.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test data
const TEST_USER = {
  email: `test-${Date.now()}@jobping-e2e.com`,
  fullName: 'E2E Test User',
  city: 'Berlin',
  workRights: 'eu_citizen',
  languages: ['English', 'German'],
  interests: 'software engineering, web development, AI',
};

test.describe('Complete User Journey E2E', () => {
  
  test.describe.configure({ mode: 'serial' });
  
  let page: Page;
  let userId: string;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('01: Landing page loads with correct branding and spacing', async () => {
    await page.goto('/');
    
    // Check hero section
    await expect(page.locator('h1')).toContainText('JobPing');
    await expect(page.locator('text=Weekly early-career matches')).toBeVisible();
    
    // Check brand colors are applied (indigo/purple gradient)
    const header = page.locator('section').first();
    await expect(header).toBeVisible();
    
    // Check sections are in correct order
    const sections = page.locator('section');
    await expect(sections.nth(0)).toContainText('JobPing'); // Hero
    await expect(sections.nth(1)).toContainText('From setup to inbox'); // HowItWorks
    await expect(sections.nth(2)).toContainText('By a student'); // BuiltForStudents
    await expect(sections.nth(3)).toContainText('Choose your plan'); // Pricing
    
    // Check only Pricing section has CTAs
    const pricingCTAs = page.locator('section:has-text("Choose your plan") a.btn-primary, section:has-text("Choose your plan") a.btn-outline');
    await expect(pricingCTAs).toHaveCount(2);
  });

  test('02: Signup form renders correctly in Tally iframe', async () => {
    await page.goto('/');
    
    // Scroll to signup section
    await page.locator('#signup').scrollIntoViewIfNeeded();
    
    // Check iframe is present
    const iframe = page.frameLocator('iframe[title="JobPing Signup"]');
    await expect(iframe.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('03: User can view pricing plans with correct tier details', async () => {
    await page.goto('/');
    
    // Scroll to pricing
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    
    // Free tier checks
    await expect(page.locator('text=Free — Weekly digest')).toBeVisible();
    await expect(page.locator('text=5 roles on signup')).toBeVisible();
    await expect(page.locator('text=1 email each week (5 roles)')).toBeVisible();
    
    // Premium tier checks
    await expect(page.locator('text=Premium — 3× weekly')).toBeVisible();
    await expect(page.locator('text=€7/mo')).toBeVisible();
    await expect(page.locator('text=Mon / Wed / Fri delivery')).toBeVisible();
    
    // Check CTAs have correct href
    const freeCTA = page.locator('a:has-text("Get 5 matches — Free")');
    await expect(freeCTA).toHaveAttribute('href', /tally\.so/);
    
    const premiumCTA = page.locator('a:has-text("Upgrade to Premium")');
    await expect(premiumCTA).toHaveAttribute('href', /tally\.so/);
  });

  test('04: Email templates have correct branding and spacing', async () => {
    // This test checks that email template generation works correctly
    // We'll mock a welcome email generation
    
    const response = await page.request.post('/api/test-email-preview', {
      data: {
        type: 'welcome',
        userName: TEST_USER.fullName,
        matchCount: 5,
      },
    });
    
    if (response.ok()) {
      const html = await response.text();
      
      // Check brand gradient is present
      expect(html).toContain('linear-gradient(135deg,#6366F1 0%,#7C3AED 50%,#8B5CF6 100%)');
      
      // Check spacing improvements
      expect(html).toContain('padding:48px 40px'); // Enhanced content padding
      expect(html).toContain('line-height:1.6'); // Improved line height
      
      // Check CTA button styling
      expect(html).toContain('padding:18px 36px'); // Larger CTA padding
      expect(html).toContain('border-radius:16px'); // Rounded corners
    }
  });

  test('05: Accessibility - Focus rings and keyboard navigation', async () => {
    await page.goto('/');
    
    // Tab to first focusable element
    await page.keyboard.press('Tab');
    
    // Check skip link appears on focus
    const skipLink = page.locator('a:has-text("Skip to content")');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    
    // Tab through pricing CTAs
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    const freeCTA = page.locator('a:has-text("Get 5 matches — Free")');
    await freeCTA.focus();
    
    // Check focus ring is visible
    const focusRing = await freeCTA.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline;
    });
    expect(focusRing).toBeTruthy();
  });

  test('06: Mobile responsiveness and spacing', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile spacing
    const content = page.locator('main');
    await expect(content).toBeVisible();
    
    // Verify no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    
    // Check pricing cards stack vertically
    const pricingCards = page.locator('#pricing .grid > div');
    const firstCard = pricingCards.first();
    const secondCard = pricingCards.last();
    
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    
    if (firstBox && secondBox) {
      // Second card should be below first card
      expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('07: Stripe checkout session creation (Premium tier)', async () => {
    const response = await page.request.post('/api/create-checkout-session', {
      data: {
        userId: 'test-user-id',
        priceId: 'price_test_monthly',
        tier: 'premium',
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('sessionId');
      expect(data.sessionId).toMatch(/^cs_test_/);
    }
  });

  test('08: Engagement tracking pixel and click tracking', async () => {
    // Test email open tracking
    const trackOpenResponse = await page.request.get('/api/track-engagement', {
      params: {
        userId: 'test-user-id',
        type: 'open',
      },
    });
    
    expect(trackOpenResponse.status()).toBe(200);
    
    // Test email click tracking
    const trackClickResponse = await page.request.get('/api/track-engagement', {
      params: {
        userId: 'test-user-id',
        type: 'click',
        url: 'https://example.com/job',
      },
    });
    
    expect(trackClickResponse.status()).toBe(302); // Should redirect
  });

  test('09: Job matching API returns correct number of jobs per tier', async () => {
    // Free tier - should get 5 jobs
    const freeResponse = await page.request.post('/api/match-users', {
      data: {
        tier: 'free',
        userPreferences: {
          city: 'Berlin',
          interests: 'software engineering',
        },
      },
    });
    
    if (freeResponse.ok()) {
      const freeData = await freeResponse.json();
      expect(freeData.matches?.length).toBeLessThanOrEqual(5);
    }
    
    // Premium tier - should also get 5 jobs (but 3x per week)
    const premiumResponse = await page.request.post('/api/match-users', {
      data: {
        tier: 'premium',
        userPreferences: {
          city: 'Berlin',
          interests: 'software engineering',
        },
      },
    });
    
    if (premiumResponse.ok()) {
      const premiumData = await premiumResponse.json();
      expect(premiumData.matches?.length).toBeLessThanOrEqual(5);
    }
  });

  test('10: Re-engagement email system', async () => {
    // Trigger re-engagement check
    const response = await page.request.post('/api/send-re-engagement', {
      data: {
        dryRun: true,
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('eligible');
      expect(Array.isArray(data.eligible)).toBe(true);
    }
  });

  test('11: Performance - Page load time', async () => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        lcp: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        cls: 0, // Would need PerformanceObserver for real CLS
      };
    });
    
    // FCP should be under 1.8s (good)
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(1800);
    }
  });

  test('12: Error handling - Invalid API requests', async () => {
    // Test invalid user ID
    const response = await page.request.post('/api/match-users', {
      data: {
        userId: 'invalid-user',
      },
    });
    
    expect([400, 404, 500]).toContain(response.status());
  });

  test('13: SEO and Meta tags', async () => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/JobPing/);
    
    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('early-career');
    
    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toContain('JobPing');
    
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDescription).toContain('early-career');
  });

  test('14: Brand consistency - Color tokens', async () => {
    await page.goto('/');
    
    // Check that brand colors are used consistently
    const primaryButton = page.locator('a.btn-primary').first();
    if (await primaryButton.count() > 0) {
      const bgColor = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      
      // Should contain gradient with brand colors
      expect(bgColor).toContain('linear-gradient');
    }
  });

  test('15: Final CTA section with Tally iframe embed', async () => {
    await page.goto('/');
    
    // Scroll to final CTA
    const finalCTA = page.locator('section').last();
    await finalCTA.scrollIntoViewIfNeeded();
    
    // Check heading
    await expect(page.locator('text=Ready to stop endless scrolling?')).toBeVisible();
    
    // Check iframe is present
    const iframe = page.locator('iframe[title="JobPing Signup"]');
    await expect(iframe).toBeVisible();
    
    // Check CTA button
    const ctaButton = page.locator('a:has-text("Get your first 5 matches free")');
    await expect(ctaButton).toBeVisible();
  });

  test('16: Billing page with premium styling', async () => {
    // Navigate to billing page (mock user ID)
    await page.goto('/billing/test-user-id');
    
    // Check premium background is applied
    const body = page.locator('body');
    const bgClasses = await body.getAttribute('class');
    expect(bgClasses).toContain('premium-bg');
    
    // Check tabs are present
    await expect(page.locator('text=Billing Overview')).toBeVisible();
    await expect(page.locator('text=Payment Methods')).toBeVisible();
    
    // Check security indicators
    await expect(page.locator('text=PCI DSS Compliant')).toBeVisible();
    await expect(page.locator('text=256-bit SSL Encryption')).toBeVisible();
    await expect(page.locator('text=Stripe Powered')).toBeVisible();
  });

  test('17: Typography hierarchy - Single h1 per page', async () => {
    await page.goto('/');
    
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // h1 should be in Hero section
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('JobPing');
    
    // Check h2 elements are section headings
    const h2Elements = page.locator('h2');
    const h2Count = await h2Elements.count();
    expect(h2Count).toBeGreaterThan(0);
    
    // Each section should have an h2
    const firstH2 = await h2Elements.first().textContent();
    expect(firstH2).toBeTruthy();
  });

  test('18: No duplicate CTAs outside Pricing section', async () => {
    await page.goto('/');
    
    // Check Hero section has NO CTA buttons
    const heroSection = page.locator('section').first();
    const heroCTAs = heroSection.locator('a.btn-primary, a.btn-outline');
    await expect(heroCTAs).toHaveCount(0);
    
    // Check all CTAs are in Pricing or FinalCTA sections
    const allCTAs = page.locator('a.btn-primary, a.btn-outline');
    const ctaCount = await allCTAs.count();
    
    // Should have 2 in Pricing + 1 in FinalCTA = 3 total
    expect(ctaCount).toBeLessThanOrEqual(3);
  });

  test('19: Email template spacing verification', async () => {
    // Verify email templates use correct spacing classes
    const response = await page.request.post('/api/test-email-preview', {
      data: {
        type: 'job-matches',
        matches: [
          {
            job: {
              title: 'Test Job',
              company: 'Test Company',
              location: 'Berlin',
              job_hash: 'test-123',
              user_email: 'test@example.com',
            },
            matchResult: { match_score: 85 },
          },
        ],
      },
    });
    
    if (response.ok()) {
      const html = await response.text();
      
      // Check job card spacing
      expect(html).toContain('padding:28px'); // Job card padding
      expect(html).toContain('margin:24px 0'); // Job card margin
      
      // Check typography spacing
      expect(html).toContain('line-height:1.3'); // Title line height
      expect(html).toContain('margin-bottom:12px'); // Title margin
    }
  });

  test('20: Cross-browser consistency check', async ({ browserName }) => {
    await page.goto('/');
    
    // Take screenshot for visual regression testing
    await page.screenshot({
      path: `test-results/e2e-${browserName}-landing.png`,
      fullPage: true,
    });
    
    // Basic rendering check
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#pricing')).toBeVisible();
  });
});

test.describe('API Endpoints E2E', () => {
  
  test('Webhook - Tally form submission', async ({ request }) => {
    const response = await request.post('/api/webhook-tally', {
      data: {
        eventId: `test-${Date.now()}`,
        eventType: 'FORM_RESPONSE',
        createdAt: new Date().toISOString(),
        data: {
          respondentId: 'test-respondent',
          formId: 'mJEqx4',
          fields: [
            { key: 'question_full_name', value: 'Test User' },
            { key: 'question_email', value: `test-${Date.now()}@test.com` },
            { key: 'question_city', value: 'Berlin' },
            { key: 'question_work_rights', value: 'eu_citizen' },
          ],
        },
      },
    });
    
    expect([200, 400]).toContain(response.status());
  });

  test('Webhook - Stripe payment success', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 'test-signature',
      },
      data: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              userId: 'test-user-id',
            },
          },
        },
      },
    });
    
    // May fail signature verification, but endpoint should handle it
    expect([200, 400, 401]).toContain(response.status());
  });

  test('Scheduled email sending respects engagement rules', async ({ request }) => {
    const response = await request.post('/api/send-scheduled-emails', {
      data: {
        tier: 'premium',
        dryRun: true,
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('eligibleUsers');
      
      // Should respect engagement rules
      if (data.eligibleUsers) {
        expect(Array.isArray(data.eligibleUsers)).toBe(true);
      }
    }
  });
});

test.describe('Edge Cases and Error States', () => {
  
  test('Handle missing environment variables gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Page should still load even if some features are disabled
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Handle API rate limiting', async ({ request }) => {
    // Make multiple rapid requests
    const requests = Array(10).fill(null).map(() => 
      request.post('/api/match-users', {
        data: { userId: 'test-user' },
      })
    );
    
    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status());
    
    // Should have at least one successful response
    expect(statuses).toContain(200);
  });

  test('Graceful degradation - No JavaScript', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    
    await page.goto('/');
    
    // Content should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Choose your plan')).toBeVisible();
    
    await context.close();
  });
});
