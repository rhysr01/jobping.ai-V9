// ✅ SERP API Scraper - High Volume Graduate Job Collection
// Follows existing JobPing scraper architecture patterns
// Implements PRD: €75/month plan, 167 daily searches, EU early-career focus

import axios from 'axios';
import { classifyEarlyCareer, convertToDatabaseFormat, parseLocation, validateJob, type IngestJob } from './utils';
// Smart strategies not available - using basic configuration

// Types matching existing scraper patterns
interface SerpApiJob {
  title: string;
  company_name: string;
  location: string;
  description: string;
  job_id?: string;
  posted_at?: string;
  apply_link?: string;
  link?: string;
  via?: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    work_from_home?: boolean;
  };
  apply_options?: Array<{
    title: string;
    link: string;
  }>;
}

interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
  error?: string;
  search_metadata?: {
    status: string;
    total_results: number;
  };
}

// ✅ SERP API Configuration - Following PRD specifications
const SERP_CONFIG = {
  baseUrl: 'https://serpapi.com/search',
  apiKey: process.env.SERP_API_KEY || '',
  
  // Target cities from PRD (7 cities with weights)
  locations: [
    { name: 'London', location: 'London,England,United Kingdom', weight: 3.0 },
    { name: 'Dublin', location: 'Dublin,County Dublin,Ireland', weight: 2.0 },
    { name: 'Berlin', location: 'Berlin,Germany', weight: 2.5 },
    { name: 'Amsterdam', location: 'Amsterdam,Netherlands', weight: 2.0 },
    { name: 'Paris', location: 'Paris,France', weight: 2.5 },
    { name: 'Madrid', location: 'Madrid,Spain', weight: 1.8 },
    { name: 'Zurich', location: 'Zurich,Switzerland', weight: 1.5 }
  ],
  
  // High-yield search terms from PRD
  searchTerms: {
    volume: [
      'graduate jobs',
      'entry level jobs', 
      'junior roles',
      'trainee positions',
      'internships'
    ],
    location: [
      'graduate roles',
      'entry level roles',
      'junior positions', 
      'trainee roles'
    ],
    career: [
      'graduate finance analyst London',
      'entry level marketing Berlin',
      'junior consultant Dublin'
    ]
  },
  
  // Budget optimization from PRD
  dailyLimit: parseInt(process.env.SERP_DAILY_LIMIT || '167'),
  hourlyLimit: process.env.JOBPING_TEST_MODE === '1' ? 3 : parseInt(process.env.SERP_HOURLY_LIMIT || '7'),
  requestDelay: process.env.JOBPING_TEST_MODE === '1' ? 800 : parseInt(process.env.SERP_REQUEST_DELAY || '3000'),
  maxRetries: 2,
  seenJobTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
};

class SerpApiScraper {
  private requestCount = 0;
  private dailyRequestCount = 0;
  private hourlyRequestCount = 0;
  private lastRequestTime = 0;
  private lastDayReset = '';
  private lastHourReset = Date.now();
  private seenJobs: Map<string, number> = new Map();
  private cityUsageCount: Map<string, number> = new Map();

  constructor() {
    this.resetCounters();
    this.cleanupSeenJobs();
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private resetCounters(): void {
    const today = new Date().toDateString();
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    const lastHour = Math.floor(this.lastHourReset / (1000 * 60 * 60));

    // Reset daily counter
    if (this.lastDayReset !== today) {
      this.dailyRequestCount = 0;
      this.lastDayReset = today;
      console.log('🔄 Daily SERP API quota reset');
    }

    // Reset hourly counter
    if (currentHour !== lastHour) {
      this.hourlyRequestCount = 0;
      this.lastHourReset = Date.now();
      console.log('🔄 Hourly SERP API quota reset');
    }
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - SERP_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private canMakeRequest(): boolean {
    this.resetCounters();
    return this.dailyRequestCount < SERP_CONFIG.dailyLimit && 
           this.hourlyRequestCount < SERP_CONFIG.hourlyLimit;
  }

  private recordRequest(): void {
    this.dailyRequestCount++;
    this.hourlyRequestCount++;
    console.log(`📊 SERP API Usage: ${this.dailyRequestCount}/${SERP_CONFIG.dailyLimit} daily, ${this.hourlyRequestCount}/${SERP_CONFIG.hourlyLimit} hourly`);
  }

  private getNextCity(): typeof SERP_CONFIG.locations[0] {
    // Calculate usage-weighted selection (from PRD)
    const cityScores = SERP_CONFIG.locations.map(city => {
      const usage = this.cityUsageCount.get(city.name) || 0;
      const score = city.weight / (usage + 1); // Inverse usage weighting
      return { city, score };
    });

    // Sort by score (highest first)
    cityScores.sort((a, b) => b.score - a.score);
    const selectedCity = cityScores[0].city;
    
    // Update usage counter
    this.cityUsageCount.set(selectedCity.name, (this.cityUsageCount.get(selectedCity.name) || 0) + 1);
    
    console.log(`🌍 Selected: ${selectedCity.name} (weight: ${selectedCity.weight})`);
    return selectedCity;
  }

  private async throttleRequest(): Promise<void> {
    if (!this.canMakeRequest()) {
      throw new Error('SERP API quota exceeded');
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < SERP_CONFIG.requestDelay) {
      const delay = SERP_CONFIG.requestDelay - timeSinceLastRequest;
      console.log(`⏰ SERP API rate limiting: waiting ${Math.round(delay / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(params: Record<string, any>): Promise<SerpApiResponse> {
    await this.throttleRequest();

    try {
      const queryParams = new URLSearchParams({
        engine: 'google_jobs',
        q: params.q,
        location: params.location,
        hl: 'en',
        gl: this.getCountryCode(params.location),
        api_key: SERP_CONFIG.apiKey
      });

      const url = `${SERP_CONFIG.baseUrl}?${queryParams.toString()}`;
      
      console.log(`🔗 SERP API request: "${params.q}" in ${params.location}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      this.recordRequest();
      
      console.log(`📊 SERP API response: ${response.data.jobs_results?.length || 0} jobs found`);
      
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 SERP API rate limited, implementing exponential backoff');
        await new Promise(resolve => setTimeout(resolve, SERP_CONFIG.requestDelay * 2));
        return this.makeRequest(params);
      }
      
      console.error('❌ SERP API error:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  }

  private getCountryCode(location: string): string {
    if (location.includes('United Kingdom') || location.includes('London')) return 'gb';
    if (location.includes('Ireland') || location.includes('Dublin')) return 'ie';
    if (location.includes('Germany') || location.includes('Berlin')) return 'de';
    if (location.includes('Netherlands') || location.includes('Amsterdam')) return 'nl';
    if (location.includes('France') || location.includes('Paris')) return 'fr';
    if (location.includes('Spain') || location.includes('Madrid')) return 'es';
    if (location.includes('Switzerland') || location.includes('Zurich')) return 'ch';
    return 'gb'; // Default to UK
  }

  private convertToIngestJob(serpJob: SerpApiJob, fallbackLocation: string): IngestJob {
    const applyLink = serpJob.apply_options?.[0]?.link || serpJob.apply_link || serpJob.link || '';
    const desc = serpJob.description || '';
    const loc = serpJob.location || fallbackLocation || '';

    return {
      title: serpJob.title || '',
      company: serpJob.company_name || '',
      location: loc,
      description: desc,
      url: applyLink,
      posted_at: serpJob.detected_extensions?.posted_at || new Date().toISOString(),
      source: 'serp-api'
    };
  }

  private isEULocation(job: IngestJob): boolean {
    const { isEU } = parseLocation(job.location);
    return isEU;
  }

  private isRemoteJob(job: IngestJob): boolean {
    const { isRemote } = parseLocation(job.location);
    return isRemote;
  }

  private generateJobHash(job: SerpApiJob): string {
    return `${job.title?.toLowerCase() || ''}-${job.company_name?.toLowerCase() || ''}-${job.location?.toLowerCase() || ''}`.replace(/\s+/g, '-');
  }

  private async searchJobs(query: string, location: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    console.log(`🔍 Searching SERP API: "${query}" in ${location}`);

    try {
      const response = await this.makeRequest({
        q: query,
        location: location
      });

      if (!response.jobs_results || response.jobs_results.length === 0) {
        console.log(`📭 No jobs found for "${query}" in ${location}`);
        return jobs;
      }

      for (const serpJob of response.jobs_results) {
        const jobHash = this.generateJobHash(serpJob);
        
        if (!this.seenJobs.has(jobHash)) {
          this.seenJobs.set(jobHash, Date.now());
          
          try {
            const ingestJob = this.convertToIngestJob(serpJob, location);
            
            // Apply validation
            const validation = validateJob(ingestJob);
            if (!validation.valid) {
              console.log(`🚫 Invalid job: ${ingestJob.title} at ${ingestJob.company}`);
              continue;
            }

            // Apply early career filtering
            if (!classifyEarlyCareer(ingestJob)) {
              console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
              continue;
            }

            // Apply EU location filtering
            if (!this.isEULocation(ingestJob)) {
              console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
              continue;
            }

            // Respect user preference: exclude remote jobs
            if (this.isRemoteJob(ingestJob)) {
              console.log(`🚫 Skipped remote: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
              continue;
            }

            jobs.push(ingestJob);
            console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);

          } catch (error) {
            console.warn(`Failed to process job ${jobHash}:`, error);
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error searching SERP API for "${query}" in ${location}:`, error.message);
    }

    return jobs;
  }

  public async scrapeAllLocations(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    if (!SERP_CONFIG.apiKey) {
      console.log('⚠️ SERP_API_KEY missing; skipping SERP API run');
      return { jobs: [], metrics: { error: 'API key missing' } };
    }

    const allJobs: IngestJob[] = [];
    
    const metrics = {
      locationsProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      dailyBudgetRemaining: SERP_CONFIG.dailyLimit,
      hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🚀 Starting SERP API scraping session`);
    console.log(`📊 Quota available: ${SERP_CONFIG.dailyLimit - this.dailyRequestCount} daily, ${SERP_CONFIG.hourlyLimit - this.hourlyRequestCount} hourly`);

    try {
      // Distribute searches across search categories (from PRD)
      const searchCategories = Object.entries(SERP_CONFIG.searchTerms);
      const searchesPerCategory = Math.floor(SERP_CONFIG.dailyLimit / searchCategories.length);
      
      for (const [category, queries] of searchCategories) {
        if (!this.canMakeRequest()) {
          console.log('⚠️ Rate limit reached, stopping searches');
          break;
        }

        console.log(`\n🔍 Searching ${category} jobs (${Math.min(searchesPerCategory, queries.length)} searches)`);
        
        for (let i = 0; i < Math.min(searchesPerCategory, queries.length) && this.canMakeRequest(); i++) {
          const city = this.getNextCity();
          const query = queries[i];
          
          try {
            const jobs = await this.searchJobs(query, city.location);
            allJobs.push(...jobs);
            metrics.locationsProcessed++;
            
          } catch (error: any) {
            const errorMsg = `Search failed for "${query}" in ${city.name}: ${error.message}`;
            console.error('❌', errorMsg);
            metrics.errors++;
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error in SERP API scraping:`, error.message);
      metrics.errors++;
    }

    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    metrics.totalJobsFound = uniqueJobs.length;
    metrics.earlyCareerJobs = uniqueJobs.length;
    metrics.requestsUsed = this.requestCount;
    metrics.dailyBudgetRemaining = SERP_CONFIG.dailyLimit - this.dailyRequestCount;
    metrics.hourlyBudgetRemaining = SERP_CONFIG.hourlyLimit - this.hourlyRequestCount;

    console.log(`\n📊 SERP API scraping complete:`);
    console.log(`   📍 Locations processed: ${metrics.locationsProcessed}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   📅 Daily budget remaining: ${metrics.dailyBudgetRemaining}`);
    console.log(`   ⏰ Hourly budget remaining: ${metrics.hourlyBudgetRemaining}`);

    return { jobs: uniqueJobs, metrics };
  }

  private deduplicateJobs(jobs: IngestJob[]): IngestJob[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}-${job.location.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  public getStatus(): any {
    this.resetCounters();
    
    return {
      isRunning: false,
      locationsSupported: SERP_CONFIG.locations.length,
      requestsToday: this.dailyRequestCount,
      requestsThisHour: this.hourlyRequestCount,
      dailyBudget: SERP_CONFIG.dailyLimit,
      hourlyBudget: SERP_CONFIG.hourlyLimit,
      dailyBudgetRemaining: SERP_CONFIG.dailyLimit - this.dailyRequestCount,
      hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit - this.hourlyRequestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      apiKeyConfigured: !!SERP_CONFIG.apiKey,
      cityUsageStats: Object.fromEntries(this.cityUsageCount)
    };
  }

  public getDailyStats(): { 
    requestsUsed: number; 
    dailyBudgetRemaining: number; 
    hourlyBudgetRemaining: number;
    seenJobsCount: number;
  } {
    this.resetCounters();
    
    return {
      requestsUsed: this.dailyRequestCount,
      dailyBudgetRemaining: SERP_CONFIG.dailyLimit - this.dailyRequestCount,
      hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit - this.hourlyRequestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default SerpApiScraper;
