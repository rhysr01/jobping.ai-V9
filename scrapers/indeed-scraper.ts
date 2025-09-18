import axios from 'axios';
import { classifyEarlyCareer, convertToDatabaseFormat } from './utils';

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

interface IndeedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  datePosted: string;
  salary?: string;
  jobType?: string;
}

interface IndeedResponse {
  results: IndeedJob[];
  totalResults: number;
}

// Configuration
const INDEED_CONFIG = {
  baseUrl: 'https://api.indeed.com/v2/jobs',
  apiKey: process.env.INDEED_API_KEY || '',
  
  // EU cities targeting (use your proven pattern)
  cities: [
    'London', 'Dublin', 'Berlin', 'Amsterdam', 'Paris', 
    'Madrid', 'Barcelona', 'Stockholm', 'Copenhagen', 'Zurich'
  ],
  
  // Early-career focused queries (your proven approach)
  queries: [
    'graduate analyst', 'junior consultant', 'data analyst',
    'trainee manager', 'associate developer'
  ],
  
  // Rate limiting (your proven approach)
  requestInterval: 1000,
  dailyBudget: 100,
  seenJobTTL: 48 * 60 * 60 * 1000
};

// Query rotation (your proven pattern)
type Track = 'A' | 'B' | 'C' | 'D' | 'E';
const TRACK_QUERIES: Record<Track, string> = {
  A: 'graduate analyst',
  B: 'junior consultant', 
  C: 'data analyst',
  D: 'trainee manager',
  E: 'associate developer'
};

class IndeedScraper {
  private dailyCallCount = 0;
  private lastRunDate = '';
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
    const pattern = dayOfYear % 5;
    return (['A', 'B', 'C', 'D', 'E'] as Track[])[pattern];
  }

  private async makeRequest(url: string, headers: Record<string, string> = {}): Promise<IndeedResponse> {
    if (this.dailyCallCount >= INDEED_CONFIG.dailyBudget) {
      throw new Error('Daily API budget exceeded');
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${INDEED_CONFIG.apiKey}`,
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json',
          ...headers
        },
        timeout: 10000
      });

      this.dailyCallCount++;
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
    const params = new URLSearchParams({
      query: TRACK_QUERIES[track],
      location: city,
      limit: '50',
      page: page.toString(),
      sort: 'date',
      // Add early-career specific filters
      experience_level: 'entry_level',
      age_max_days: '7'
    });

    return `${INDEED_CONFIG.baseUrl}?${params.toString()}`;
  }

  private convertToIngestJob(sourceJob: IndeedJob, city: string): IngestJob {
    return {
      title: sourceJob.title,
      company: sourceJob.company,
      location: `${city}, ${sourceJob.location}`,
      description: sourceJob.description,
      url: sourceJob.url,
      posted_at: sourceJob.datePosted,
      source: 'indeed'
    };
  }

  private generateJobKey(job: IndeedJob, city: string): string {
    return `${job.id}_${job.company}_${job.title}_${city}`.toLowerCase();
  }

  private async fetchCityJobs(city: string, track: Track): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    let page = 1;
    const maxPages = 3;

    while (page <= maxPages && this.dailyCallCount < INDEED_CONFIG.dailyBudget - 3) {
      try {
        const url = this.buildUrl(city, track, page);
        const response = await this.makeRequest(url);

        if (response.results.length === 0) break;

        // Process jobs with your proven filtering approach
        for (const job of response.results) {
          const jobKey = this.generateJobKey(job, city);
          if (!this.seenJobs.has(jobKey)) {
            this.seenJobs.add(jobKey);
            
            try {
              const ingestJob = this.convertToIngestJob(job, city);
              
              // ✅ Apply your proven early-career filtering
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

        page++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting

      } catch (error: any) {
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
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      callsUsed: 0,
      budgetRemaining: INDEED_CONFIG.dailyBudget,
      errors: 0
    };

    console.log(`🔄 Indeed scraping with Track ${track}: ${TRACK_QUERIES[track]}`);

    for (const city of INDEED_CONFIG.cities) {
      try {
        console.log(`📍 Processing ${city}...`);
        const cityJobs = await this.fetchCityJobs(city, track);
        
        allJobs.push(...cityJobs);
        metrics.citiesProcessed++;
        metrics.earlyCareerJobs += cityJobs.length;

        console.log(`✅ ${city}: ${cityJobs.length} early-career jobs found`);

      } catch (error: any) {
        console.error(`❌ Error processing ${city}:`, error.message);
        metrics.errors++;
      }
    }

    metrics.totalJobsFound = allJobs.length;
    metrics.callsUsed = this.dailyCallCount;
    metrics.budgetRemaining = INDEED_CONFIG.dailyBudget - this.dailyCallCount;

    console.log(`📊 Indeed scraping complete: ${metrics.earlyCareerJobs} early-career jobs found, ${metrics.callsUsed} API calls used`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleCity(city: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    this.resetDailyCount();
    const track = this.getTrackForDay();
    
    console.log(`📍 Indeed scraping ${city} with Track ${track}`);
    
    const jobs = await this.fetchCityJobs(city, track);
    
    const metrics = {
      city,
      track,
      jobsFound: jobs.length,
      callsUsed: this.dailyCallCount,
      budgetRemaining: INDEED_CONFIG.dailyBudget - this.dailyCallCount
    };

    return { jobs, metrics };
  }

  public getDailyStats(): { callsUsed: number; budgetRemaining: number; lastRun: string } {
    return {
      callsUsed: this.dailyCallCount,
      budgetRemaining: INDEED_CONFIG.dailyBudget - this.dailyCallCount,
      lastRun: this.lastRunDate
    };
  }

  public getTargetCities(): string[] {
    return INDEED_CONFIG.cities;
  }

  public getStatus(): any {
    return {
      isRunning: false,
      citiesSupported: INDEED_CONFIG.cities.length,
      dailyBudget: INDEED_CONFIG.dailyBudget,
      callsUsed: this.dailyCallCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default IndeedScraper;
