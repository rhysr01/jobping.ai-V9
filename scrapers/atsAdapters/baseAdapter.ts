import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IngestJob, SourceAdapter, RateLimitConfig, HostCooldown } from '../types';

export abstract class BaseATSAdapter implements SourceAdapter {
  protected client: AxiosInstance;
  protected rateLimitConfig: RateLimitConfig;
  protected hostCooldowns: Map<string, HostCooldown> = new Map();
  protected lastRequestTime: Map<string, number> = new Map();

  constructor(rateLimitConfig: RateLimitConfig = {
    requestsPerSecond: 1,
    requestsPerMinute: 60,
    requestsPerHour: 3600,
    maxConcurrency: 5,
    backoffMultiplier: 2,
    maxRetries: 3
  }) {
    this.rateLimitConfig = rateLimitConfig;
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
        'Accept': 'application/json'
      }
    });
  }

  abstract fetchListings(input: Record<string, string>): Promise<IngestJob[]>;

  protected async makeRequest(url: string, options: any = {}): Promise<AxiosResponse> {
    const host = new URL(url).hostname;
    
    // Check if host is in cooldown
    const cooldown = this.hostCooldowns.get(host);
    if (cooldown?.cooldownUntil && new Date() < new Date(cooldown.cooldownUntil)) {
      throw new Error(`Host ${host} is in cooldown until ${cooldown.cooldownUntil}`);
    }

    // Rate limiting
    await this.enforceRateLimit(host);

    try {
      const response = await this.client.request({
        url,
        ...options
      });
      
      // Reset cooldown on success
      this.hostCooldowns.delete(host);
      
      return response;
    } catch (error: any) {
      await this.handleRequestError(host, error);
      throw error;
    }
  }

  private async enforceRateLimit(host: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(host) || 0;
    const minDelay = 1000 / this.rateLimitConfig.requestsPerSecond;
    
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime.set(host, Date.now());
  }

  private async handleRequestError(host: string, error: any): Promise<void> {
    const status = error.response?.status;
    const cooldown = this.hostCooldowns.get(host) || {
      host,
      blockedCount: 0,
      lastBlocked: new Date().toISOString()
    };

    if (status === 429 || status === 403 || status >= 500) {
      cooldown.blockedCount++;
      cooldown.lastBlocked = new Date().toISOString();
      
      // Exponential backoff
      const backoffHours = Math.min(24, Math.pow(this.rateLimitConfig.backoffMultiplier, cooldown.blockedCount));
      cooldown.cooldownUntil = new Date(Date.now() + backoffHours * 60 * 60 * 1000).toISOString();
      
      this.hostCooldowns.set(host, cooldown);
      
      console.warn(`Host ${host} blocked (${status}). Cooldown until ${cooldown.cooldownUntil}`);
    }
  }

  protected classifyEarlyCareer(title: string, description: string): { early: boolean; eligibility: "certain" | "uncertain" } {
    const earlySignals = [
      'intern', 'internship', 'graduate', 'trainee', 'entry level', 'junior', 
      '0-2 years', 'no experience', 'new grad', 'recent graduate', 'student',
      'entry-level', 'associate', 'apprentice'
    ];
    
    const seniorSignals = [
      'senior', 'lead', 'principal', 'staff', 'manager', 'director', 'head of',
      '10+ years', '5+ years', 'experienced', 'expert'
    ];

    const text = `${title} ${description}`.toLowerCase();
    
    const hasEarlySignals = earlySignals.some(signal => text.includes(signal));
    const hasSeniorSignals = seniorSignals.some(signal => text.includes(signal));
    
    if (hasEarlySignals && !hasSeniorSignals) {
      return { early: true, eligibility: "certain" };
    } else if (hasSeniorSignals) {
      return { early: false, eligibility: "certain" };
    } else {
      return { early: true, eligibility: "uncertain" };
    }
  }

  protected parseLocation(locationText: string): { location: string; country: string | null; remote_scope: "emea" | "world" | null } {
    const euCountries = ['UK', 'GB', 'DE', 'FR', 'NL', 'IE', 'ES', 'IT', 'BE', 'SE', 'DK', 'NO', 'FI', 'CH', 'AT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'MT', 'CY', 'LU'];
    const euCities = ['London', 'Berlin', 'Paris', 'Amsterdam', 'Dublin', 'Madrid', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki', 'Zurich', 'Vienna', 'Warsaw', 'Prague', 'Budapest', 'Bucharest', 'Sofia', 'Zagreb', 'Ljubljana', 'Bratislava', 'Vilnius', 'Riga', 'Tallinn', 'Valletta', 'Nicosia', 'Luxembourg'];
    
    const text = locationText.toLowerCase();
    
    // Check for remote indicators
    if (text.includes('remote') || text.includes('anywhere')) {
      if (text.includes('emea') || text.includes('eu') || text.includes('europe')) {
        return { location: 'Remote (EMEA)', country: null, remote_scope: 'emea' };
      } else {
        return { location: 'Remote', country: null, remote_scope: 'world' };
      }
    }
    
    // Check for EU cities/countries
    for (const city of euCities) {
      if (text.includes(city.toLowerCase())) {
        return { location: city, country: null, remote_scope: null };
      }
    }
    
    // Check for EU country codes
    for (const country of euCountries) {
      if (text.includes(country.toLowerCase())) {
        return { location: locationText, country, remote_scope: null };
      }
    }
    
    return { location: locationText || 'Unknown', country: null, remote_scope: null };
  }

  protected inferRole(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    const rolePatterns = {
      'tech': ['software', 'engineer', 'developer', 'programmer', 'coding', 'full stack', 'frontend', 'backend', 'devops', 'sre', 'data engineer', 'ml engineer', 'ai engineer'],
      'data': ['data scientist', 'analyst', 'analytics', 'bi', 'business intelligence', 'machine learning', 'ml', 'ai', 'statistics'],
      'product': ['product manager', 'product owner', 'pm', 'product'],
      'design': ['designer', 'ux', 'ui', 'user experience', 'user interface', 'graphic design'],
      'marketing': ['marketing', 'growth', 'seo', 'sem', 'content', 'social media'],
      'sales': ['sales', 'account executive', 'business development', 'bd'],
      'finance': ['finance', 'accounting', 'investment', 'banking', 'trading', 'risk'],
      'consulting': ['consultant', 'consulting', 'strategy', 'advisory'],
      'operations': ['operations', 'project manager', 'program manager', 'coordinator'],
      'sustainability': ['sustainability', 'esg', 'environmental', 'green']
    };
    
    for (const [role, patterns] of Object.entries(rolePatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return role;
      }
    }
    
    return 'general';
  }

  protected makeJobHash(company: string, title: string, jobUrl: string, postedAt: string): string {
    const dateStr = new Date(postedAt).toISOString().split('T')[0]; // YYYY-MM-DD
    const hashInput = `${company}|${title}|${jobUrl}|${dateStr}`;
    
    // Simple hash function (you might want to use crypto.createHash in production)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  protected createIngestJob(
    title: string,
    company: string,
    description: string,
    jobUrl: string,
    postedAt: string,
    source: string,
    location?: string,
    languages?: string[],
    workEnvironment?: string
  ): IngestJob {
    const { early, eligibility } = this.classifyEarlyCareer(title, description);
    const { location: parsedLocation, country, remote_scope } = this.parseLocation(location || '');
    const role = this.inferRole(title, description);
    const jobHash = this.makeJobHash(company, title, jobUrl, postedAt);
    
    return {
      title,
      company,
      description,
      job_url: jobUrl,
      posted_at: postedAt,
      source,
      location: parsedLocation,
      languages_required: languages,
      work_environment: workEnvironment,
      meta: {
        early,
        eligibility,
        role,
        remote_scope,
        country,
        signals: []
      },
      job_hash: jobHash
    };
  }
}
