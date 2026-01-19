const { chromium } = require('playwright');

async function takeScreenshot() {
  console.log('🚀 Taking screenshot of live site...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('📱 Navigating to live site...');
    await page.goto('https://jobping-26aiy915v-rhys-rowlands-projects.vercel.app', {
      waitUntil: 'networkidle'
    });

    // Wait a bit for animations
    await page.waitForTimeout(2000);

    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: 'live-site-screenshot.png',
      fullPage: true
    });

    console.log('✅ Screenshot saved as live-site-screenshot.png');

    // Also take a screenshot of just the hero section
    const heroElement = await page.$('[data-testid="hero-section"]');
    if (heroElement) {
      await heroElement.screenshot({ path: 'hero-section-screenshot.png' });
      console.log('✅ Hero section screenshot saved as hero-section-screenshot.png');
    }

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshot();