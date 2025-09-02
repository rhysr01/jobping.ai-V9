import axios from 'axios';

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

interface AdzunaJob {
  id: string;
  title: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area: string[];
  };
  description: string;
  redirect_url: string;
  created: string;
  category: {
    label: string;
  };
  salary_min?: number;
  salary_max?: number;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean: number;
}

// Adzuna API Configuration
const ADZUNA_CONFIG = {
  baseUrl: 'https://api.adzuna.com/v1/api/jobs',
  appId: process.env.ADZUNA_APP_ID || '',
  appKey: process.env.ADZUNA_APP_KEY || '',
  countries: {
    'Dublin': 'ie',
    'London': 'gb',
    'Madrid': 'es', 
    'Berlin': 'de',
    'Paris': 'fr',
    'Barcelona': 'es',
    'Zurich': 'ch',
    'Milan': 'it',
    'Rome': 'it',
    'Amsterdam': 'nl'
  },
  dailyBudget: 33, // 1,000 calls/month ≈ 33/day
  reserveCalls: 3
};

// Track rotation strategy
type Track = 'A' | 'B' | 'C';

const TRACK_QUERIES: Record<Track, string> = {
  A: '(intern OR graduate OR junior)',
  B: '(student OR trainee OR entry-level)',
  C: '(praktikum OR becario OR stagiaire OR stagiair)'
};

class AdzunaScraper {
  private dailyCallCount = 0;
  private lastRunDate = '';
  private cityCache: Map<string, { etag?: string; lastModified?: string; lastJobCount: number }> = new Map();
  private seenJobs: Set<string> = new Set();

  constructor() {
    this.resetDailyCount();
  }

  private resetDailyCount(): void {
    const today = new Date().toDateString();
    if (this.lastRunDate !== today) {
      this.dailyCallCount = 0;
      this.lastRunDate = today;
      this.seenJobs.clear();
    }
  }

  private getTrackForDay(): Track {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Day 1: Track A, Day 2: Track B, Day 3: Track A, Day 4: Track C, repeat
    const pattern = dayOfYear % 4;
    if (pattern === 0 || pattern === 2) return 'A';
    if (pattern === 1) return 'B';
    return 'C';
  }

  private async makeRequest(url: string, headers: Record<string, string> = {}): Promise<AdzunaResponse> {
    if (this.dailyCallCount >= ADZUNA_CONFIG.dailyBudget) {
      throw new Error('Daily API budget exceeded');
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json',
          ...headers
        },
        timeout: 10000
      });

      this.dailyCallCount++;
      
      // Cache ETag and Last-Modified for future requests
      const etag = response.headers.etag;
      const lastModified = response.headers['last-modified'];
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        console.warn(`Rate limited, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, headers);
      }
      throw error;
    }
  }

  private buildUrl(city: string, track: Track, page: number = 1): string {
    const country = ADZUNA_CONFIG.countries[city];
    if (!country) {
      throw new Error(`Unsupported city: ${city}`);
    }

    const params = new URLSearchParams({
      app_id: ADZUNA_CONFIG.appId,
      app_key: ADZUNA_CONFIG.appKey,
      what: TRACK_QUERIES[track],
      where: city,
      distance: '15',
      'content-type': 'application/json',
      sort_by: 'date',
      results_per_page: '50',
      max_days_old: '2',
      page: page.toString()
    });

    return `${ADZUNA_CONFIG.baseUrl}/${country}/search/${page}?${params.toString()}`;
  }

  private convertToIngestJob(adzunaJob: AdzunaJob, city: string): IngestJob {
    return {
      title: adzunaJob.title,
      company: adzunaJob.company.display_name,
      location: `${city}, ${adzunaJob.location.area?.[0] || city}`,
      description: adzunaJob.description,
      url: adzunaJob.redirect_url,
      posted_at: adzunaJob.created,
      source: 'adzuna'
    };
  }

  private generateJobKey(job: AdzunaJob, city: string): string {
    return `${job.id}_${job.company.display_name}_${job.title}_${city}`.toLowerCase();
  }

  private async fetchCityJobs(city: string, track: Track): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 3; // Conservative limit per city

    while (hasMorePages && page <= maxPages) {
      try {
        const url = this.buildUrl(city, track, page);
        const cacheKey = `${city}_${track}_${page}`;
        const cached = this.cityCache.get(cacheKey);

        // Check if we have enough budget
        if (this.dailyCallCount >= ADZUNA_CONFIG.dailyBudget - ADZUNA_CONFIG.reserveCalls) {
          console.log(`Budget constraint: stopping at page ${page} for ${city}`);
          break;
        }

        const response = await this.makeRequest(url, {
          ...(cached?.etag && { 'If-None-Match': cached.etag }),
          ...(cached?.lastModified && { 'If-Modified-Since': cached.lastModified })
        });

        if (response.results.length === 0) {
          hasMorePages = false;
          break;
        }

        // Process jobs and dedupe
        for (const job of response.results) {
          const jobKey = this.generateJobKey(job, city);
          if (!this.seenJobs.has(jobKey)) {
            this.seenJobs.add(jobKey);
            const ingestJob = this.convertToIngestJob(job, city);
            jobs.push(ingestJob);
          }
        }

        // Update cache
        this.cityCache.set(cacheKey, {
          lastJobCount: response.results.length
        });

        // Check if we should continue to next page
        if (response.results.length < 50) {
          hasMorePages = false;
        }

        page++;
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        if (error.response?.status === 304) {
          // Not modified, skip this page
          hasMorePages = false;
          break;
        }
        console.error(`Error fetching ${city} page ${page}:`, error.message);
        break;
      }
    }

    return jobs;
  }

  public async scrapeAllCities(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    this.resetDailyCount();
    const track = this.getTrackForDay();
    const allJobs: IngestJob[] = [];
    const metrics = {
      citiesProcessed: 0,
      totalJobs: 0,
      newJobs: 0,
      duplicates: 0,
      errors: 0,
      callsUsed: 0,
      budgetRemaining: ADZUNA_CONFIG.dailyBudget
    };

    console.log(`🔄 Adzuna scraping with Track ${track}: ${TRACK_QUERIES[track]}`);

    for (const city of Object.keys(ADZUNA_CONFIG.countries)) {
      try {
        console.log(`📍 Processing ${city}...`);
        const cityJobs = await this.fetchCityJobs(city, track);
        
        allJobs.push(...cityJobs);
        metrics.citiesProcessed++;
        metrics.totalJobs += cityJobs.length;
        metrics.newJobs += cityJobs.length;

        console.log(`✅ ${city}: ${cityJobs.length} jobs found`);

        // Check if city had low yield and we have budget for extra page
        const cityCache = this.cityCache.get(`${city}_${track}_1`);
        if (cityCache && cityCache.lastJobCount < 20 && this.dailyCallCount < ADZUNA_CONFIG.dailyBudget - 1) {
          console.log(`🔄 Low yield for ${city}, fetching extra page...`);
          const extraJobs = await this.fetchCityJobs(city, track);
          allJobs.push(...extraJobs);
          metrics.totalJobs += extraJobs.length;
          metrics.newJobs += extraJobs.length;
        }

      } catch (error: any) {
        console.error(`❌ Error processing ${city}:`, error.message);
        metrics.errors++;
      }
    }

    metrics.callsUsed = this.dailyCallCount;
    metrics.budgetRemaining = ADZUNA_CONFIG.dailyBudget - this.dailyCallCount;

    console.log(`📊 Adzuna scraping complete: ${metrics.totalJobs} jobs, ${metrics.callsUsed} calls used, ${metrics.budgetRemaining} remaining`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleCity(city: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    this.resetDailyCount();
    const track = this.getTrackForDay();
    
    console.log(`📍 Adzuna scraping ${city} with Track ${track}`);
    
    const jobs = await this.fetchCityJobs(city, track);
    const metrics = {
      city,
      track,
      jobsFound: jobs.length,
      callsUsed: this.dailyCallCount,
      budgetRemaining: ADZUNA_CONFIG.dailyBudget - this.dailyCallCount
    };

    return { jobs, metrics };
  }

  public getDailyStats(): { callsUsed: number; budgetRemaining: number; lastRun: string } {
    return {
      callsUsed: this.dailyCallCount,
      budgetRemaining: ADZUNA_CONFIG.dailyBudget - this.dailyCallCount,
      lastRun: this.lastRunDate
    };
  }

  public getCountries(): Record<string, string> {
    return ADZUNA_CONFIG.countries;
  }

  public getTargetCities(): string[] {
    return Object.keys(ADZUNA_CONFIG.countries);
  }
}

export default AdzunaScraper;
