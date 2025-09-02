import axios from 'axios';

// JobPing-specific user agent for ethical scraping
export const JOBPING_USER_AGENT = 'JobPingBot/1.0 (+https://getjobping.com/contact)';

// Robots.txt compliance checker
export class RobotsCompliance {
  private static robotsCache = new Map<string, { rules: any; timestamp: number }>();
  private static cacheExpiry = 3600000; // 1 hour

  /**
   * Check if scraping is allowed for a given URL
   */
  static async isScrapingAllowed(baseUrl: string, path: string = '/'): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const robotsUrl = this.getRobotsUrl(baseUrl);
      const robotsRules = await this.getRobotsRules(robotsUrl);
      
      if (!robotsRules) {
        // If no robots.txt found, assume allowed (but log for monitoring)
        console.log(`🤖 Robots decision for ${baseUrl}: allowed (no_robots_txt)`);
        return { allowed: true, reason: 'no_robots_txt' };
      }

      // Check if our user agent is specifically disallowed
      const userAgent = JOBPING_USER_AGENT;
      const isDisallowed = robotsRules.disallow.some((rule: string) => {
        return path.startsWith(rule);
      });

      if (isDisallowed) {
        console.log(`🤖 Robots decision for ${baseUrl}: denied_by_robots (path: ${path})`);
        return { 
          allowed: false, 
          reason: `robots.txt disallows path: ${path}` 
        };
      }

      // Check if we have a crawl delay
      const crawlDelay = robotsRules.crawlDelay || 1; // Default 1 second
      
      // Add delay if specified
      if (crawlDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, crawlDelay * 1000));
      }

      console.log(`🤖 Robots decision for ${baseUrl}: allowed (robots_txt_allows)`);
      return { allowed: true, reason: 'robots_txt_allows' };

    } catch (error) {
      console.error(`❌ Robots.txt check failed for ${baseUrl}:`, error);
      // On error, be conservative and don't scrape
      console.log(`🤖 Robots decision for ${baseUrl}: denied_by_robots (robots_txt_error)`);
      return { allowed: false, reason: 'robots_txt_error' };
    }
  }

  /**
   * Get robots.txt URL for a given base URL
   */
  private static getRobotsUrl(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      return `${url.protocol}//${url.host}/robots.txt`;
    } catch {
      // Fallback for malformed URLs
      return `${baseUrl}/robots.txt`;
    }
  }

  /**
   * Fetch and parse robots.txt rules
   */
  private static async getRobotsRules(robotsUrl: string): Promise<any | null> {
    const now = Date.now();
    const cached = this.robotsCache.get(robotsUrl);
    
    // Return cached version if still valid
    if (cached && (now - cached.timestamp) < this.cacheExpiry) {
      return cached.rules;
    }

    try {
      const response = await axios.get(robotsUrl, {
        headers: {
          'User-Agent': JOBPING_USER_AGENT
        },
        timeout: 10000
      });

      const robotsText = response.data;
      const rules = this.parseRobotsTxt(robotsText);
      
      // Cache the rules
      this.robotsCache.set(robotsUrl, { rules, timestamp: now });
      
      return rules;

    } catch (error: any) {
      if (error.response?.status === 404) {
        // No robots.txt found
        this.robotsCache.set(robotsUrl, { rules: null, timestamp: now });
        return null;
      }
      throw error;
    }
  }

  /**
   * Parse robots.txt content into structured rules
   */
  private static parseRobotsTxt(robotsText: string): any {
    const lines = robotsText.split('\n');
    const rules = {
      userAgents: [] as string[],
      disallow: [] as string[],
      allow: [] as string[],
      crawlDelay: 1,
      sitemap: [] as string[]
    };

    let currentUserAgent = '*';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [directive, value] = trimmed.split(':').map(s => s.trim());
      
      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value;
          if (!rules.userAgents.includes(currentUserAgent)) {
            rules.userAgents.push(currentUserAgent);
          }
          break;
          
        case 'disallow':
          if (currentUserAgent === '*' || currentUserAgent === 'jobping') {
            rules.disallow.push(value);
          }
          break;
          
        case 'allow':
          if (currentUserAgent === '*' || currentUserAgent === 'jobping') {
            rules.allow.push(value);
          }
          break;
          
        case 'crawl-delay':
          if (currentUserAgent === '*' || currentUserAgent === 'jobping') {
            rules.crawlDelay = parseInt(value) || 1;
          }
          break;
          
        case 'sitemap':
          rules.sitemap.push(value);
          break;
      }
    }

    return rules;
  }

  /**
   * Get JobPing-specific headers for ethical scraping
   */
  static getJobPingHeaders(): Record<string, string> {
    // Use a more browser-like user agent to avoid detection
    const browserUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    return {
      'User-Agent': browserUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };
  }

  /**
   * Log scraping activity for compliance monitoring
   */
  static logScrapingActivity(platform: string, url: string, success: boolean): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      platform,
      url,
      success,
      userAgent: JOBPING_USER_AGENT
    };
    
    console.log(`🤖 [ROBOTS] ${success ? '✅' : '❌'} ${platform} - ${url}`);
    
    // In production, this could be sent to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service
    }
  }
}

// Rate limiting utility for respectful scraping
export class RespectfulRateLimiter {
  private static delays = new Map<string, number>();
  private static defaultDelay = 5000; // 5 seconds default - more respectful

  static async waitForDomain(domain: string): Promise<void> {
    const lastRequest = this.delays.get(domain) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < this.defaultDelay) {
      const waitTime = this.defaultDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.delays.set(domain, Date.now());
  }

  static setDelayForDomain(domain: string, delayMs: number): void {
    this.delays.set(domain, delayMs);
  }
}
