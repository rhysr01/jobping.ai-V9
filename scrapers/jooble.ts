// ✅ Jooble Scraper - EU Early Career Jobs
import axios from 'axios';
import { classifyEarlyCareer, convertToDatabaseFormat } from './utils';
import { getSmartDateStrategy, getSmartPaginationStrategy, withFallback } from './smart-strategies';

// Types
interface IngestJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at: string;
  source: string;
}

interface JoobleRequest {
  keywords: string;
  location: string;
  radius?: string;
  salarymin?: string;
  salarymax?: string;
  salary?: string;
  datecreatedfrom?: string;
  page?: string;
}

interface JoobleJob {
  title: string;
  location: string;
  snippet: string;
  salary: string;
  source: string;
  type: string;
  link: string;
  company: string;
  updated: string;
}

interface JoobleResponse {
  totalCount: number;
  jobs: JoobleJob[];
}

// ✅ Jooble Configuration
const JOOBLE_CONFIG = {
  baseUrl: 'https://jooble.org/api',
  apiKey: process.env.JOOBLE_API_KEY || '',
  
  // EU target cities
  locations: [
    'Dublin, Ireland',
    'London, United Kingdom', 
    'Berlin, Germany',
    'Amsterdam, Netherlands',
    'Paris, France',
    'Munich, Germany',
    'Madrid, Spain',
    'Stockholm, Sweden',
    'Zurich, Switzerland',
    'Copenhagen, Denmark',
    'Vienna, Austria',
    'Brussels, Belgium',
    'Prague, Czech Republic',
    'Warsaw, Poland',
    'Barcelona, Spain',
    'Milan, Italy'
  ],
  
  // Core early-career keywords (5 per language max to avoid burning API quota)
  keywords: {
    en: ['graduate', 'intern', 'junior', 'trainee', 'entry level'],
    de: ['praktikum', 'junior', 'absolvent', 'trainee', 'einsteiger'],
    fr: ['stage', 'junior', 'diplômé', 'trainee', 'débutant'],
    nl: ['stage', 'junior', 'trainee', 'starter', 'afgestudeerde'],
    es: ['prácticas', 'junior', 'graduado', 'trainee', 'becario'],
    it: ['tirocinio', 'junior', 'laureato', 'trainee', 'stagista'],
    sv: ['praktikant', 'junior', 'nyexaminerad', 'trainee'],
    da: ['praktikant', 'junior', 'nyuddannet', 'trainee'],
    pl: ['stażysta', 'junior', 'absolwent', 'trainee'],
    cs: ['praktikant', 'junior', 'absolvent', 'trainee']
  },
  
  // Rate limiting
  requestInterval: 2000, // 2 seconds between requests
  dailyBudget: 1000, // 1000 requests per day
  seenJobTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  resultsPerPage: 20,
  maxPagesPerSearch: 3 // Will be overridden by smart strategy at runtime
};

class JoobleScraper {
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastRequestTime = 0;
  private lastDayReset = '';
  private seenJobs: Map<string, number> = new Map();

  constructor() {
    this.resetDailyCounts();
    this.cleanupSeenJobs();
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private resetDailyCounts(): void {
    const today = new Date().toDateString();
    if (this.lastDayReset !== today) {
      this.dailyRequestCount = 0;
      this.lastDayReset = today;
    }
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - JOOBLE_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private async throttleRequest(): Promise<void> {
    this.resetDailyCounts();
    
    if (this.dailyRequestCount >= JOOBLE_CONFIG.dailyBudget) {
      throw new Error('Daily Jooble API budget exceeded');
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < JOOBLE_CONFIG.requestInterval) {
      const delay = JOOBLE_CONFIG.requestInterval - timeSinceLastRequest;
      console.log(`⏰ Jooble rate limiting: waiting ${Math.round(delay / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(request: JoobleRequest): Promise<JoobleResponse> {
    await this.throttleRequest();

    try {
      const url = `${JOOBLE_CONFIG.baseUrl}/${JOOBLE_CONFIG.apiKey}`;
      
      console.log(`🔗 Jooble API request: ${request.keywords} in ${request.location} (page ${request.page || 1})`);

      const response = await axios.post(url, request, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JobPing/1.0 (https://jobping.com)'
        },
        timeout: 15000
      });

      this.requestCount++;
      this.dailyRequestCount++;
      
      console.log(`📊 Jooble API response: ${response.data.jobs?.length || 0} jobs found`);
      
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Jooble rate limited, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.makeRequest(request);
      }
      
      console.error('❌ Jooble API error:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  }

  private convertToIngestJob(joobleJob: JoobleJob): IngestJob {
    return {
      title: joobleJob.title,
      company: joobleJob.company || 'Unknown',
      location: joobleJob.location,
      description: joobleJob.snippet,
      url: joobleJob.link,
      posted_at: joobleJob.updated,
      source: 'jooble'
    };
  }

  private isEULocation(location: string): boolean {
    const euCountries = [
      'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain',
      'Italy', 'Netherlands', 'Belgium', 'Poland', 'Sweden',
      'Denmark', 'Finland', 'Austria', 'Portugal', 'Greece',
      'Switzerland', 'Norway', 'Czech', 'Romania', 'Bulgaria',
      'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Cyprus'
    ];
    const loc = (location || '').toLowerCase();
    return euCountries.some(country => loc.includes(country.toLowerCase()));
  }

  private generateJobHash(job: JoobleJob): string {
    return `${job.title.toLowerCase()}-${job.company.toLowerCase()}-${job.location.toLowerCase()}`.replace(/\s+/g, '-');
  }

  private async searchJobs(keywords: string, location: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    console.log(`🔍 Searching Jooble: "${keywords}" in ${location}`);

    try {
      for (let page = 1; page <= JOOBLE_CONFIG.maxPagesPerSearch; page++) {
        if (this.dailyRequestCount >= JOOBLE_CONFIG.dailyBudget - 5) {
          console.log('⏰ Approaching daily budget limit, stopping');
          break;
        }

        // Use smart date strategy
        const smartDateCreated = withFallback(() => getSmartDateStrategy('jooble'), '7');
        
        const request: JoobleRequest = {
          keywords: keywords,
          location: location,
          page: page.toString(),
          datecreatedfrom: smartDateCreated // Smart date rotation
        };

        const response = await this.makeRequest(request);
        
        if (!response.jobs || response.jobs.length === 0) {
          console.log(`📭 No more jobs found for "${keywords}" in ${location} (page ${page})`);
          break;
        }

        console.log(`📊 Found ${response.jobs.length} jobs for "${keywords}" in ${location} (page ${page})`);

        for (const job of response.jobs) {
          const jobHash = this.generateJobHash(job);
          
          if (!this.seenJobs.has(jobHash)) {
            this.seenJobs.set(jobHash, Date.now());
            
            try {
              const ingestJob = this.convertToIngestJob(job);
                // Skip remote per policy
                if ((ingestJob.location || '').toLowerCase().includes('remote')) {
                  continue;
                }
                // EU-only filter
                if (!this.isEULocation(ingestJob.location)) {
                  console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                  continue;
                }
              
              const isEarlyCareer = classifyEarlyCareer(ingestJob);
              if (isEarlyCareer) {
                jobs.push(ingestJob);
                console.log(`✅ Early-career: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
              } else {
                console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
              }
            } catch (error) {
              console.warn(`Failed to process job ${jobHash}:`, error);
            }
          }
        }

        // If we got fewer jobs than expected, we've likely reached the end
        if (response.jobs.length < JOOBLE_CONFIG.resultsPerPage) {
          break;
        }
      }

    } catch (error: any) {
      console.error(`❌ Error searching Jooble for "${keywords}" in ${location}:`, error.message);
    }

    return jobs;
  }

  public async scrapeAllLocations(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    // Apply smart pagination strategy at runtime
    const pagination = withFallback(() => getSmartPaginationStrategy('jooble'), { startPage: 1, endPage: 3 });
    // this.JOOBLE_CONFIG.maxPagesPerSearch = pagination.endPage; // TODO: Fix config reference
    
    const allJobs: IngestJob[] = [];
    
    const metrics = {
      locationsProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      dailyBudgetRemaining: JOOBLE_CONFIG.dailyBudget,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 Jooble scraping - EU Early Career Jobs`);
    console.log(`📍 Target locations: ${JOOBLE_CONFIG.locations.length}`);
    console.log(`🔑 Keywords: ${Object.keys(JOOBLE_CONFIG.keywords).join(', ')}`);

    try {
      // Process locations in batches to manage rate limits
      const batchSize = 3;
      const locationBatches = [];
      
      for (let i = 0; i < JOOBLE_CONFIG.locations.length; i += batchSize) {
        locationBatches.push(JOOBLE_CONFIG.locations.slice(i, i + batchSize));
      }

      for (const batch of locationBatches) {
        // Check if we have enough daily budget for this batch
        if (this.dailyRequestCount >= JOOBLE_CONFIG.dailyBudget - (batch.length * 10)) {
          console.log('⏰ Approaching daily budget limit, stopping early');
          break;
        }

        for (const location of batch) {
          try {
            console.log(`\n📍 Processing ${location}...`);
            
            // Get language-specific keywords for this location and combine them
            const locationKeywords = this.getKeywordsForLocation(location);
            
            // Use first keyword only to avoid API issues with OR syntax
            const primaryKeyword = locationKeywords[0];
            const locationJobs = await this.searchJobs(primaryKeyword, location);
            allJobs.push(...locationJobs);
            
            metrics.locationsProcessed++;
            metrics.earlyCareerJobs += allJobs.length;

            console.log(`✅ ${location}: ${allJobs.length} total early-career jobs found`);

          } catch (error: any) {
            console.error(`❌ Error processing ${location}:`, error.message);
            metrics.errors++;
            
            // If we get repeated errors, wait longer before continuing
            if (error.response?.status >= 400) {
              console.log('⏸️ API error encountered, waiting 30s before continuing...');
              await new Promise(resolve => setTimeout(resolve, 30000));
            }
          }
        }

        // Small delay between batches
        if (locationBatches.indexOf(batch) < locationBatches.length - 1) {
          console.log('⏸️ Brief pause between location batches...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

    } catch (error: any) {
      console.error(`❌ Error in Jooble scraping:`, error.message);
      metrics.errors++;
    }

    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    metrics.totalJobsFound = uniqueJobs.length;
    metrics.earlyCareerJobs = uniqueJobs.length;
    metrics.requestsUsed = this.requestCount;
    metrics.dailyBudgetRemaining = JOOBLE_CONFIG.dailyBudget - this.dailyRequestCount;

    console.log(`\n📊 Jooble scraping complete:`);
    console.log(`   📍 Locations processed: ${metrics.locationsProcessed}/${JOOBLE_CONFIG.locations.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   📅 Daily budget remaining: ${metrics.dailyBudgetRemaining}`);

    return { jobs: uniqueJobs, metrics };
  }

  private getKeywordsForLocation(location: string): string[] {
    // Map locations to appropriate language keywords
    const locationLangMap: Record<string, string[]> = {
      'Dublin, Ireland': JOOBLE_CONFIG.keywords.en,
      'London, United Kingdom': JOOBLE_CONFIG.keywords.en,
      'Berlin, Germany': JOOBLE_CONFIG.keywords.de,
      'Munich, Germany': JOOBLE_CONFIG.keywords.de,
      'Amsterdam, Netherlands': JOOBLE_CONFIG.keywords.nl,
      'Paris, France': JOOBLE_CONFIG.keywords.fr,
      'Madrid, Spain': JOOBLE_CONFIG.keywords.es,
      'Barcelona, Spain': JOOBLE_CONFIG.keywords.es,
      'Stockholm, Sweden': JOOBLE_CONFIG.keywords.sv,
      'Copenhagen, Denmark': JOOBLE_CONFIG.keywords.da,
      'Vienna, Austria': JOOBLE_CONFIG.keywords.de,
      'Brussels, Belgium': [...JOOBLE_CONFIG.keywords.en, ...JOOBLE_CONFIG.keywords.fr, ...JOOBLE_CONFIG.keywords.nl],
      'Prague, Czech Republic': JOOBLE_CONFIG.keywords.cs,
      'Warsaw, Poland': JOOBLE_CONFIG.keywords.pl,
      'Zurich, Switzerland': [...JOOBLE_CONFIG.keywords.en, ...JOOBLE_CONFIG.keywords.de],
      'Milan, Italy': JOOBLE_CONFIG.keywords.it
    };

    return locationLangMap[location] || JOOBLE_CONFIG.keywords.en;
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
    this.resetDailyCounts();
    
    return {
      isRunning: false,
      locationsSupported: JOOBLE_CONFIG.locations.length,
      requestsToday: this.dailyRequestCount,
      dailyBudget: JOOBLE_CONFIG.dailyBudget,
      dailyBudgetRemaining: JOOBLE_CONFIG.dailyBudget - this.dailyRequestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      apiKeyConfigured: !!JOOBLE_CONFIG.apiKey
    };
  }

  public getDailyStats(): { 
    requestsUsed: number; 
    dailyBudgetRemaining: number; 
    seenJobsCount: number;
  } {
    this.resetDailyCounts();
    
    return {
      requestsUsed: this.dailyRequestCount,
      dailyBudgetRemaining: JOOBLE_CONFIG.dailyBudget - this.dailyRequestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default JoobleScraper;
