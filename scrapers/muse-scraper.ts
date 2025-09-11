// ✅ FIXED Muse Scraper - Optimized for EU Early Career Jobs
import axios from 'axios';
import { classifyEarlyCareer, convertToDatabaseFormat } from './utils.js';
import { getSmartDateStrategy, getSmartPaginationStrategy, withFallback } from './smart-strategies.js';

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

// ✅ OPTIMIZED Muse API Configuration
const MUSE_CONFIG = {
  baseUrl: 'https://www.themuse.com/api/public/jobs',
  apiKey: process.env.MUSE_API_KEY || '', // Optional but recommended
  
  // ✅ FIXED: Use EU cities that actually have jobs in Muse
  locations: [
    'Dublin, Ireland',
    'Berlin, Germany',
    'Amsterdam, Netherlands',
    'Paris, France',
    'Madrid, Spain',
    'Munich, Germany',
    'Stockholm, Sweden',
    'Zurich, Switzerland',
    'Copenhagen, Denmark',
    'Barcelona, Spain',
    'Milan, Italy'
  ],
  
  // ✅ CORRECTED: Use exact category names from Muse API
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
    'Customer Success',
    'Editorial',
    'HR & Recruiting'
  ],
  
  // ✅ CORRECTED: Use exact level names from Muse API
  levels: [
    'Entry Level',
    'Internship',
    'Mid Level'  // Some mid-level roles are still early career
  ],
  
  // ✅ OPTIMIZED: Better rate limiting for 500 req/hour limit
  requestInterval: 8000, // 8 seconds = 450 requests/hour (safe buffer)
  maxRequestsPerHour: 450, // Leave buffer under 500 limit
  seenJobTTL: 72 * 60 * 60 * 1000, // 72 hours
  resultsPerPage: 20, // Max for Muse API
  // Prefer API early-career filter; will fallback to local regex if sparse
  preferApiEarlyCareer: true,
  apiEarlyLevels: ['Entry Level', 'Internship'] as const
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
  private seenJobs: Map<number, number> = new Map();

  constructor() {
    this.cleanupSeenJobs();
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

  // ✅ FIXED: EU location detection for Muse jobs (comprehensive)
  private isEULocation(job: IngestJob): boolean {
    const location = job.location?.toLowerCase() || '';
    const euPatterns = [
      // Countries
      'united kingdom', 'uk', 'great britain', 'britain', 'england', 'scotland', 'wales',
      'ireland', 'republic of ireland', 'ie',
      'germany', 'deutschland', 'de',
      'france', 'fr', 'république française',
      'spain', 'españa', 'es',
      'italy', 'italia', 'it',
      'netherlands', 'holland', 'nl', 'nederland',
      'belgium', 'belgique', 'belgië', 'be',
      'austria', 'österreich', 'at',
      'switzerland', 'schweiz', 'suisse', 'ch',
      'sweden', 'sverige', 'se',
      'denmark', 'danmark', 'dk',
      'norway', 'norge', 'no',
      'finland', 'suomi', 'fi',
      'poland', 'polska', 'pl',
      'czech republic', 'czechia', 'cz',
      'hungary', 'magyarország', 'hu',
      'portugal', 'pt',
      'greece', 'ελλάδα', 'gr',
      'romania', 'românia', 'ro',
      'bulgaria', 'българия', 'bg',
      'croatia', 'hrvatska', 'hr',
      'slovenia', 'slovenija', 'si',
      'slovakia', 'slovensko', 'sk',
      'estonia', 'eesti', 'ee',
      'latvia', 'latvija', 'lv',
      'lithuania', 'lietuva', 'lt',
      'luxembourg', 'lëtzebuerg', 'lu',
      'malta', 'mt',
      'cyprus', 'κύπρος', 'cy',
      // Major EU Cities
      'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh',
      'dublin', 'cork', 'galway',
      'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'stuttgart',
      'paris', 'lyon', 'marseille', 'toulouse', 'nice',
      'madrid', 'barcelona', 'valencia', 'seville', 'bilbao',
      'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
      'amsterdam', 'rotterdam', 'the hague', 'utrecht',
      'brussels', 'antwerp', 'ghent',
      'vienna', 'salzburg', 'graz',
      'zurich', 'geneva', 'basel', 'bern',
      'stockholm', 'gothenburg', 'malmö',
      'copenhagen', 'aarhus', 'odense',
      'oslo', 'bergen', 'trondheim',
      'helsinki', 'tampere', 'turku',
      'warsaw', 'krakow', 'gdansk', 'wroclaw',
      'prague', 'brno', 'ostrava',
      'budapest', 'debrecen', 'szeged',
      'lisbon', 'porto', 'braga',
      'athens', 'thessaloniki', 'patras',
      'bucharest', 'cluj-napoca', 'timisoara',
      'sofia', 'plovdiv', 'varna'
    ];
    
    // Check if location contains any EU pattern
    return euPatterns.some(pattern => location.includes(pattern));
  }

  private resetHourlyCount(): void {
    const now = Date.now();
    if (now - this.lastHourReset > 60 * 60 * 1000) {
      this.hourlyRequestCount = 0;
      this.lastHourReset = now;
    }
  }

  private getTrackForRun(): Track {
    const hour = new Date().getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    return tracks[hour % 5];
  }

  private async throttleRequest(): Promise<void> {
    this.resetHourlyCount();
    
    if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour) {
      console.log('⏰ Hourly rate limit reached, waiting...');
      const waitTime = 60 * 60 * 1000 - (Date.now() - this.lastHourReset);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.resetHourlyCount();
      }
    }
    
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
      // ✅ CORRECTED: Build proper query parameters for Muse API
      const queryParams: Record<string, any> = {
        page: params.page || 1,
        descending: true
      };

      if (params.location) {
        queryParams.location = params.location;
      }

      if (params.categories && params.categories.length > 0) {
        queryParams.category = params.categories.join(',');
      }

      if (params.levels && params.levels.length > 0) {
        queryParams.level = params.levels.join(',');
      }

      if (MUSE_CONFIG.apiKey) {
        queryParams.api_key = MUSE_CONFIG.apiKey;
      }

      console.log(`🔗 Muse API request: ${MUSE_CONFIG.baseUrl}`, queryParams);

      const response = await axios.get(MUSE_CONFIG.baseUrl, {
        params: queryParams,
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      this.requestCount++;
      this.hourlyRequestCount++;
      
      console.log(`📊 Muse API response: ${response.data.results?.length || 0} jobs found`);
      
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Rate limited by The Muse, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.makeRequest(params);
      }
      
      if (error.response?.status === 400) {
        console.warn('⚠️ Bad request to The Muse API:', error.response.data);
        console.warn('⚠️ Parameters used:', params);
        throw new Error(`Bad request: ${error.response.data?.message || 'Invalid parameters'}`);
      }
      
      console.error('❌ Muse API error:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  }

  private convertToIngestJob(museJob: MuseJob): IngestJob {
    // ✅ IMPROVED: Better location handling
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
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
  }

  private async fetchLocationJobs(
    location: string, 
    categories: string[], 
    levels: string[]
  ): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    // Use smart strategies for date filtering and pagination
    const smartMaxDays = withFallback(() => getSmartDateStrategy('muse'), '7');
    const pagination = withFallback(() => getSmartPaginationStrategy('muse'), { startPage: 1, endPage: 5 });
    
    console.log(`📍 Scraping ${location} for categories: ${categories.join(', ')}, levels: ${levels.join(', ')} (max ${smartMaxDays} days, pages ${pagination.startPage}-${pagination.endPage})`);

    try {
      // ✅ Only include non-empty parameters to avoid API issues
      const params: any = {
        location: location,
        page: 1
      };
      
      // Add date filtering if Muse API supports it
      if (smartMaxDays && smartMaxDays !== '7') {
        params.max_days_old = smartMaxDays;
      }
      
      // Only add categories if not empty
      if (categories.length > 0) {
        params.categories = categories;
      }
      
      // Only add levels if not empty
      if (levels.length > 0) {
        params.levels = levels;
      }

      // Prefer API early-career levels if configured
      const initialLevels = (MUSE_CONFIG.preferApiEarlyCareer ? MUSE_CONFIG.apiEarlyLevels : levels);
      if (initialLevels && initialLevels.length > 0) {
        params.levels = initialLevels as any;
      }

      const response = await this.makeRequest(params);
      
      if (!response.results || response.results.length === 0) {
        console.log(`📭 No jobs found for ${location}`);
        return jobs;
      }

      console.log(`📊 Found ${response.results.length} jobs in ${location}`);

      for (const job of response.results) {
        if (!this.seenJobs.has(job.id)) {
          this.seenJobs.set(job.id, Date.now());
          
          try {
            const ingestJob = this.convertToIngestJob(job);
            
            // ✅ Apply early-career filtering with correct object structure
            const isEarlyCareer = classifyEarlyCareer({
              title: ingestJob.title || "",
              description: ingestJob.description || "",
              company: ingestJob.company,
              location: ingestJob.location,
              url: ingestJob.url,
              posted_at: ingestJob.posted_at,
              source: ingestJob.source
            } as IngestJob);
            // ✅ FIXED: Filter for EU locations only
            const isEULocation = this.isEULocation(ingestJob);
            
            if (isEarlyCareer && isEULocation) {
              jobs.push(ingestJob);
              console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
            } else if (isEarlyCareer && !isEULocation) {
              console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
            } else {
              console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
            }
          } catch (error) {
            console.warn(`Failed to process job ${job.id}:`, error);
          }
        }
      }

      // ✅ OPTIMIZED: Fetch remaining pages using smart pagination strategy
      if (response.page_count && response.page_count > 1) {
        const maxExtraPages = Math.min(response.page_count, pagination.endPage); // Use smart pagination
        for (let page = pagination.startPage + 1; page <= maxExtraPages; page++) {
          if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour - 2) {
            console.log('⏰ Approaching hourly rate limit during pagination, stopping.');
            break;
          }
          console.log(`📄 Fetching page ${page} for ${location}...`);
          const pageResponse = await this.makeRequest({
            ...params,
            page
          });
          for (const job of pageResponse.results || []) {
            if (!this.seenJobs.has(job.id)) {
              this.seenJobs.set(job.id, Date.now());
              try {
                const ingestJob = this.convertToIngestJob(job);
                const isEarlyCareer = classifyEarlyCareer({
                  title: ingestJob.title || "",
                  description: ingestJob.description || "",
                  company: ingestJob.company,
                  location: ingestJob.location,
                  url: ingestJob.url,
                  posted_at: ingestJob.posted_at,
                  source: ingestJob.source
                } as IngestJob);
                if (isEarlyCareer) {
                  jobs.push(ingestJob);
                  console.log(`✅ Early-career (p${page}): ${ingestJob.title} at ${ingestJob.company}`);
                }
              } catch (error) {
                console.warn(`Failed to process job ${job.id} from page ${page}:`, error);
              }
            }
          }
        }
      }

      // Fallback: if very few early-career jobs, retry without API level filter and rely on local regex
      if (jobs.length < 3 && MUSE_CONFIG.preferApiEarlyCareer && initialLevels && (initialLevels as any).length > 0) {
        console.log(`↩️  Sparse results with API levels for ${location}, retrying without level filter...`);
        const retryParams: any = { location, page: 1 };
        const retryResponse = await this.makeRequest(retryParams);
        for (const job of retryResponse.results || []) {
          if (!this.seenJobs.has(job.id)) {
            this.seenJobs.set(job.id, Date.now());
            try {
              const ingestJob = this.convertToIngestJob(job);
              const isEarlyCareer = classifyEarlyCareer({
                title: ingestJob.title || '',
                description: ingestJob.description || '',
                company: ingestJob.company,
                location: ingestJob.location,
                url: ingestJob.url,
                posted_at: ingestJob.posted_at,
                source: ingestJob.source
              } as IngestJob);
              if (isEarlyCareer) {
                jobs.push(ingestJob);
                console.log(`✅ Early-career (fallback): ${ingestJob.title} at ${ingestJob.company}`);
              }
            } catch (_e) {}
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error fetching jobs for ${location}:`, error.message);
    }

    return jobs;
  }

  public async scrapeAllLocations(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    // ✅ OPTIMIZED: Get ALL jobs, filter with multilingual early career detection
    const categories: string[] = []; // Empty = no category filter
    const levels: string[] = []; // Empty = no level filter - get ALL jobs
    const allJobs: IngestJob[] = [];
    
    const metrics = {
      track: 'All',
      categories: 'All Categories',
      levels: 'All Levels (filtered locally)',
      locationsProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 The Muse scraping - All Categories, All Levels (multilingual filtering)`);
    console.log(`📋 Categories: All (no filter)`);
    console.log(`🎯 Levels: All (filtered with multilingual early career detection)`);

    // ✅ OPTIMIZED: Process more locations with better batching
    const batchSize = 3; // Smaller batches for better rate limit management
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
        await new Promise(resolve => setTimeout(resolve, 3000));
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
    // ✅ OPTIMIZED: Get ALL jobs, filter with multilingual early career detection
    const categories: string[] = []; // Empty = no category filter
    const levels: string[] = []; // Empty = no level filter - get ALL jobs
    
    console.log(`📍 The Muse scraping ${location} - All Categories, All Levels (multilingual filtering)`);
    
    const jobs = await this.fetchLocationJobs(location, categories, levels);
    
    const metrics = {
      location,
      track: 'All',
      categories: 'All Categories',
      levels: 'All Levels (filtered locally)',
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
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      apiKeyConfigured: !!MUSE_CONFIG.apiKey
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