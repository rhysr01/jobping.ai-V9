// Railway Configuration System
// Safe, throttled HTTP-only scraping for Railway environment

const bool = (k: string, d = false) => (process.env[k]?.toLowerCase() === 'true') ?? d;
const int = (k: string, d: number) => Number(process.env[k] ?? d);

export const CFG = {
  env: process.env.RAILWAY_ENVIRONMENT ?? 'local',
  useBrowser: !bool('DISABLE_PUPPETEER', false),
  browserPool: bool('ENABLE_BROWSER_POOL', true),
  rateLimitEnabled: bool('ENABLE_RATE_LIMITING', true),
  rpm: int('SCRAPER_REQUESTS_PER_MINUTE', 10),
  rph: int('SCRAPER_REQUESTS_PER_HOUR', 300),
} as const;

// Throttling system
let lastRun = 0;

export async function throttle(makeReq: () => Promise<any>) {
  if (!CFG.rateLimitEnabled) return makeReq();
  
  const minDelay = Math.max(60_000 / CFG.rpm, 3_600_000 / CFG.rph);
  const now = Date.now();
  const wait = Math.max(0, lastRun + minDelay - now);
  
  if (wait) {
    console.log(`⏳ Throttling: waiting ${wait}ms (${CFG.rpm} rpm, ${CFG.rph} rph)`);
    await new Promise(r => setTimeout(r, wait));
  }
  
  lastRun = Date.now();
  return makeReq();
}

// HTTP-only fetch for Railway
export async function fetchHtml(url: string) {
  if (CFG.useBrowser) {
    throw new Error('Browser mode disabled on Railway - use HTTP-only scraping');
  }
  
  return throttle(() => 
    import('axios').then(axios => 
      axios.default.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'JobPingBot/1.0 (+https://getjobping.com/contact)'
        }
      }).then(r => r.data)
    )
  );
}

// Log current configuration
export function logConfig() {
  console.log('🚂 Railway Configuration:');
  console.log(`   Environment: ${CFG.env}`);
  console.log(`   Browser Mode: ${CFG.useBrowser ? 'enabled' : 'disabled'}`);
  console.log(`   Browser Pool: ${CFG.browserPool ? 'enabled' : 'disabled'}`);
  console.log(`   Rate Limiting: ${CFG.rateLimitEnabled ? 'enabled' : 'disabled'}`);
  console.log(`   Requests/Min: ${CFG.rpm}`);
  console.log(`   Requests/Hour: ${CFG.rph}`);
}
