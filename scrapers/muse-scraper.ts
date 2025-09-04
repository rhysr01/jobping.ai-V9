import axios from 'axios';
import { classifyEarlyCareer, convertToDatabaseFormat } from './utils.js';

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

interface MuseJob {
  id: number;
  name: string; // job title
  company: {
    id: number;
    name: string;
    short_name: string;
    locations: Array<{
      name: string;
    }>;
  };
  locations: Array<{
    name: string;
  }>;
  contents: string; // job description
  refs: {
    landing_page: string; // application URL
  };
  publication_date: string;
  levels: Array<{
    name: string;
    short_name: string;
  }>;
  categories: Array<{
    name: string;
  }>;
  tags: Array<{
    name: string;
    short_name: string;
  }>;
  model_type: string;
}

interface MuseResponse {
  results: MuseJob[];
  page: number;
  page_count: number;
  total: number;
}

// The Muse API Configuration
const MUSE_CONFIG = {
  baseUrl: 'https://www.themuse.com/api/public/jobs',
  apiKey: process.env.MUSE_API_KEY || '', // Optional - works without key but has lower limits
  
  // EU-focused locations (The Muse uses location names, not codes)
  locations: [
    'London, United Kingdom',
    'Dublin, Ireland', 
    'Berlin, Germany',
    'Munich, Germany',
    'Amsterdam, Netherlands',
    'Paris, France',
    'Madrid, Spain',
    'Barcelona, Spain',
    'Stockholm, Sweden',
    'Copenhagen, Denmark',
    'Zurich, Switzerland',
    'Vienna, Austria',
    'Milan, Italy',
    'Brussels, Belgium',
    'Prague, Czech Republic'
  ],
  
  // Early-career focused categories
  categories: [
    'Engineering',
    'Data Science', 
    'Business & Strategy',
    'Marketing & PR',
    'Sales',
    'Finance',
    'Operations',
    'Product',
    'Design',
    'Customer Success'
  ],
  
  // Early-career levels (The Muse has good level filtering)
  levels: [
    'Entry Level',
    'Internship',
    'Mid Level' // Include mid-level as some are still early-career
  ],
  
  // Rate limiting (The Muse: 500 requests/hour, 10,000/month)
  requestInterval: 8000, // ~7 requests per minute to stay safe
  maxRequestsPerHour: 400, // Leave buffer under 500 limit
  seenJobTTL: 72 * 60 * 60 * 1000, // 72 hours (Muse jobs change slowly)
  
  // Results per page (max 20 for The Muse)
  resultsPerPage: 20
};

// Career path rotation for diverse job discovery
type Track = 'A' | 'B' | 'C' | 'D' | 'E';

const TRACK_CATEGORIES: Record<Track, string[]> = {
  A: ['Engineering', 'Data Science'], // Tech focus
  B: ['Business & Strategy', 'Finance'], // Business focus  
  C: ['Marketing & PR', 'Sales'], // Growth focus
  D: ['Product', 'Design'], // Product focus
  E: ['Operations', 'Customer Success'] // Operations focus
};

const TRACK_LEVELS: Record<Track, string[]> = {
  A: ['Entry Level', 'Internship'],
  B: ['Entry Level', 'Mid Level'], 
  C: ['Entry Level', 'Internship'],
  D: ['Entry Level', 'Mid Level'],
  E: ['Entry Level', 'Internship']
};

class MuseScraper {
  private requestCount = 0;
  private hourlyRequestCount = 0;
  private lastRequestTime = 0;
  private lastHourReset = Date.now();
  private seenJobs: Map<number, number> = new Map(); // jobId -> timestamp

  constructor() {
    this.cleanupSeenJobs();
    
    // Clean up seen jobs every 4 hours
    setInterval(() => this.cleanupSeenJobs(), 4 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - MUSE_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private resetHourlyCount(): void {
    const now = Date.now();
    if (now - this.lastHourReset > 60 * 60 * 1000) { // 1 hour
      this.hourlyRequestCount = 0;
      this.lastHourReset = now;
    }
  }

  private getTrackForRun(): Track {
    // Simple rotation based on hour of day
    const hour = new Date().getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    return tracks[hour % 5];
  }

  private async throttleRequest(): Promise<void> {
    this.resetHourlyCount();
    
    // Check hourly limit
    if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour) {
      console.log('⏰ Hourly rate limit reached, waiting...');
      const waitTime = 60 * 60 * 1000 - (Date.now() - this.lastHourReset);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.resetHourlyCount();
      }
    }
    
    // Throttle individual requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < MUSE_CONFIG.requestInterval) {
      const delay = MUSE_CONFIG.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(params: Record<string, any>): Promise<MuseResponse> {
    await this.throttleRequest();

    try {
      const response = await axios.get(MUSE_CONFIG.baseUrl, {
        params: {
          // Core parameters
          category: params.category,
          level: params.level,
          location: params.location,
          page: params.page || 1,
          descending: true, // Most recent first
          
          // Optional API key for higher limits
          ...(MUSE_CONFIG.apiKey && { api_key: MUSE_CONFIG.apiKey }),
          
          // Fixed parameters
          ...params
        },
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      this.requestCount++;
      this.hourlyRequestCount++;
      
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Rate limited by The Muse, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second backoff
        return this.makeRequest(params);
      }
      
      if (error.response?.status === 400) {
        console.warn('⚠️ Bad request to The Muse API:', error.response.data);
        throw new Error(`Bad request: ${error.response.data?.message || 'Invalid parameters'}`);
      }
      
      throw error;
    }
  }

  private convertToIngestJob(museJob: MuseJob): IngestJob {
    // Handle location - prefer job location, fallback to company location
    let location = 'Remote';
    if (museJob.locations && museJob.locations.length > 0) {
      location = museJob.locations[0].name;
    } else if (museJob.company.locations && museJob.company.locations.length > 0) {
      location = museJob.company.locations[0].name;
    }

    return {
      title: museJob.name,
      company: museJob.company.name,
      location: location,
      description: this.stripHtmlTags(museJob.contents),
      url: museJob.refs.landing_page,
      posted_at: museJob.publication_date,
      source: 'themuse'
    };
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
  }

  private async fetchLocationJobs(
    location: string, 
    categories: string[], 
    levels: string[]
  ): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    console.log(`📍 Scraping ${location} for categories: ${categories.join(', ')}`);

    try {
      // The Muse API takes comma-separated values
      const params = {
        location: location,
        category: categories.join(','),
        level: levels.join(','),
        page: 1
      };

      const response = await this.makeRequest(params);
      console.log(`📊 Found ${response.results.length} jobs in ${location}`);

      for (const job of response.results) {
        if (!this.seenJobs.has(job.id)) {
          this.seenJobs.set(job.id, Date.now());
          
          try {
            const ingestJob = this.convertToIngestJob(job);
            
            // ✅ Apply early-career filtering
            const isEarlyCareer = classifyEarlyCareer(ingestJob);
            if (isEarlyCareer) {
              jobs.push(ingestJob);
              console.log(`✅ Early-career: ${ingestJob.title} at ${ingestJob.company}`);
            } else {
              console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
            }
          } catch (error) {
            console.warn(`Failed to process job ${job.id}:`, error);
          }
        }
      }

      // If there are more pages and we have budget, fetch page 2
      if (response.page_count > 1 && this.hourlyRequestCount < MUSE_CONFIG.maxRequestsPerHour - 10) {
        console.log(`📄 Fetching page 2 for ${location}...`);
        
        const page2Response = await this.makeRequest({
          ...params,
          page: 2
        });

        for (const job of page2Response.results) {
          if (!this.seenJobs.has(job.id)) {
            this.seenJobs.set(job.id, Date.now());
            
            try {
              const ingestJob = this.convertToIngestJob(job);
              const isEarlyCareer = classifyEarlyCareer(ingestJob);
              if (isEarlyCareer) {
                jobs.push(ingestJob);
                console.log(`✅ Early-career (p2): ${ingestJob.title} at ${ingestJob.company}`);
              }
            } catch (error) {
              console.warn(`Failed to process job ${job.id} from page 2:`, error);
            }
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error fetching jobs for ${location}:`, error.message);
    }

    return jobs;
  }

  public async scrapeAllLocations(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const categories = TRACK_CATEGORIES[track];
    const levels = TRACK_LEVELS[track];
    const allJobs: IngestJob[] = [];
    
    const metrics = {
      track,
      categories: categories.join(', '),
      levels: levels.join(', '),
      locationsProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 The Muse scraping with Track ${track}`);
    console.log(`📋 Categories: ${categories.join(', ')}`);
    console.log(`🎯 Levels: ${levels.join(', ')}`);

    // Process locations in batches to manage rate limits
    const batchSize = 5;
    const locationBatches = [];
    
    for (let i = 0; i < MUSE_CONFIG.locations.length; i += batchSize) {
      locationBatches.push(MUSE_CONFIG.locations.slice(i, i + batchSize));
    }

    for (const batch of locationBatches) {
      // Check if we have enough hourly budget for this batch
      if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour - (batch.length * 2)) {
        console.log('⏰ Approaching hourly rate limit, stopping early');
        break;
      }

      for (const location of batch) {
        try {
          console.log(`\n📍 Processing ${location}...`);
          const locationJobs = await this.fetchLocationJobs(location, categories, levels);
          
          allJobs.push(...locationJobs);
          metrics.locationsProcessed++;
          metrics.earlyCareerJobs += locationJobs.length;

          console.log(`✅ ${location}: ${locationJobs.length} early-career jobs found`);

        } catch (error: any) {
          console.error(`❌ Error processing ${location}:`, error.message);
          metrics.errors++;
        }
      }

      // Small delay between batches
      if (locationBatches.indexOf(batch) < locationBatches.length - 1) {
        console.log('⏸️ Brief pause between location batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    metrics.totalJobsFound = allJobs.length;
    metrics.requestsUsed = this.requestCount;
    metrics.hourlyBudgetRemaining = MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount;

    console.log(`\n📊 The Muse scraping complete:`);
    console.log(`   📍 Locations processed: ${metrics.locationsProcessed}/${MUSE_CONFIG.locations.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   ⏰ Hourly budget remaining: ${metrics.hourlyBudgetRemaining}`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleLocation(location: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const categories = TRACK_CATEGORIES[track];
    const levels = TRACK_LEVELS[track];
    
    console.log(`📍 The Muse scraping ${location} with Track ${track}`);
    
    const jobs = await this.fetchLocationJobs(location, categories, levels);
    
    const metrics = {
      location,
      track,
      categories: categories.join(', '),
      levels: levels.join(', '),
      jobsFound: jobs.length,
      requestsUsed: this.requestCount,
      hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount
    };

    return { jobs, metrics };
  }

  public getStatus(): any {
    this.resetHourlyCount();
    
    return {
      isRunning: false,
      locationsSupported: MUSE_CONFIG.locations.length,
      categoriesSupported: MUSE_CONFIG.categories.length,
      requestsThisHour: this.hourlyRequestCount,
      hourlyBudget: MUSE_CONFIG.maxRequestsPerHour,
      hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }

  public getTargetLocations(): string[] {
    return MUSE_CONFIG.locations;
  }

  public getDailyStats(): { requestsUsed: number; hourlyBudgetRemaining: number; seenJobsCount: number } {
    this.resetHourlyCount();
    
    return {
      requestsUsed: this.requestCount,
      hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default MuseScraper;
