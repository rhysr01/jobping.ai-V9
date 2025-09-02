import axios from 'axios';
import { Job } from './types';
import { 
  IngestJob, 
  classifyEarlyCareer, 
  inferRole, 
  parseLocation, 
  makeJobHash, 
  validateJob, 
  convertToDatabaseFormat, 
  shouldSaveJob, 
  logJobProcessing 
} from './utils';

// Reed API Configuration
const REED_CONFIG = {
  baseUrl: 'https://www.reed.co.uk/api/1.0/search',
  apiKey: process.env.REED_API_KEY || '',
  // UK business hours: 08:00-20:00 local time
  businessHours: {
    start: 8,
    end: 20
  },
  // Self-throttle to ~1 req/sec
  requestInterval: 1000,
  // Run every 30 minutes
  runInterval: 30 * 60 * 1000,
  // Keep seen jobs for 48 hours
  seenJobTTL: 48 * 60 * 60 * 1000
};

// Alternating run strategies
type RunType = 'A' | 'B';

const RUN_QUERIES: Record<RunType, string> = {
  A: '(graduate OR intern)',
  B: '(junior OR entry level)'
};

interface ReedJob {
  jobId: number;
  employerName: string;
  jobTitle: string;
  locationName: string;
  jobDescription: string;
  jobUrl: string;
  datePosted: string;
  maximumSalary?: number;
  minimumSalary?: number;
  jobType: string;
  distanceFromLocation: number;
}

interface ReedResponse {
  totalResults: number;
  results: ReedJob[];
}

class ReedScraper {
  private lastRequestTime = 0;
  private seenJobs: Map<number, number> = new Map(); // jobId -> timestamp
  private lastRunType: RunType = 'A';
  private isRunning = false;

  constructor() {
    this.cleanupSeenJobs();
    // Clean up seen jobs every hour
    setInterval(() => this.cleanupSeenJobs(), 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - REED_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= REED_CONFIG.businessHours.start && hour < REED_CONFIG.businessHours.end;
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < REED_CONFIG.requestInterval) {
      const delay = REED_CONFIG.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(params: Record<string, any>): Promise<ReedResponse> {
    await this.throttleRequest();

    try {
      const response = await axios.get(REED_CONFIG.baseUrl, {
        params: {
          keywords: params.keywords,
          locationName: params.locationName,
          distanceFromLocation: params.distanceFromLocation || 10,
          resultsToTake: params.resultsToTake || 100,
          permanent: params.permanent,
          sortBy: 'DisplayDate',
          ...params
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(REED_CONFIG.apiKey + ':').toString('base64')}`,
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Rate limited by Reed, backing off...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.makeRequest(params);
      }
      throw error;
    }
  }

  private convertToIngestJob(reedJob: ReedJob): IngestJob {
    return {
      title: reedJob.jobTitle,
      company: reedJob.employerName,
      location: reedJob.locationName,
      description: reedJob.jobDescription,
      url: reedJob.jobUrl,
      posted_at: reedJob.datePosted,
      source: 'reed'
    };
  }

  private async fetchLondonJobs(sinceIso?: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    // Determine run type for this execution
    const runType = this.lastRunType === 'A' ? 'B' : 'A';
    this.lastRunType = runType;

    console.log(`🔄 Reed scraping London with Run ${runType}: ${RUN_QUERIES[runType]}`);

    try {
      // Try permanent positions first
      const permanentParams = {
        keywords: RUN_QUERIES[runType],
        locationName: 'London',
        distanceFromLocation: 10,
        resultsToTake: 100,
        permanent: true,
        ...(sinceIso && { fromDate: sinceIso })
      };

      const permanentResponse = await this.makeRequest(permanentParams);
      
      for (const job of permanentResponse.results) {
        if (!this.seenJobs.has(job.jobId)) {
          this.seenJobs.set(job.jobId, Date.now());
          const ingestJob = this.convertToIngestJob(job);
          jobs.push(ingestJob);
        }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try contract/temporary positions
      const contractParams = {
        keywords: RUN_QUERIES[runType],
        locationName: 'London',
        distanceFromLocation: 10,
        resultsToTake: 100,
        permanent: false,
        ...(sinceIso && { fromDate: sinceIso })
      };

      const contractResponse = await this.makeRequest(contractParams);
      
      for (const job of contractResponse.results) {
        if (!this.seenJobs.has(job.jobId)) {
          this.seenJobs.set(job.jobId, Date.now());
          const ingestJob = this.convertToIngestJob(job);
          jobs.push(ingestJob);
        }
      }

    } catch (error: any) {
      console.error('Error fetching Reed jobs:', error.message);
      throw error;
    }

    return jobs;
  }

  public async scrapeLondon(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    if (this.isRunning) {
      throw new Error('Reed scraper is already running');
    }

    if (!this.isBusinessHours()) {
      console.log('⏰ Outside business hours, skipping Reed scrape');
      return { jobs: [], metrics: { reason: 'outside_business_hours' } };
    }

    this.isRunning = true;

    try {
      // Get timestamp from 30 minutes ago for incremental pull
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const jobs = await this.fetchLondonJobs(thirtyMinutesAgo);
      
      const metrics = {
        runType: this.lastRunType,
        jobsFound: jobs.length,
        newJobs: jobs.length,
        duplicates: 0, // Already filtered out in fetch
        seenJobsCount: this.seenJobs.size,
        businessHours: true,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Reed scraping complete: ${jobs.length} new jobs found`);

      return { jobs, metrics };

    } finally {
      this.isRunning = false;
    }
  }

  public async scrapeLondonWithDateRange(fromDate: string, toDate: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    if (this.isRunning) {
      throw new Error('Reed scraper is already running');
    }

    this.isRunning = true;

    try {
      const jobs: IngestJob[] = [];
      const runType = this.lastRunType === 'A' ? 'B' : 'A';
      
      // Fetch jobs for the specified date range
      const params = {
        keywords: RUN_QUERIES[runType],
        locationName: 'London',
        distanceFromLocation: 10,
        resultsToTake: 100,
        fromDate,
        toDate
      };

      const response = await this.makeRequest(params);
      
      for (const job of response.results) {
        if (!this.seenJobs.has(job.jobId)) {
          this.seenJobs.set(job.jobId, Date.now());
          const ingestJob = this.convertToIngestJob(job);
          jobs.push(ingestJob);
        }
      }

      const metrics = {
        runType,
        jobsFound: jobs.length,
        newJobs: jobs.length,
        dateRange: { fromDate, toDate },
        seenJobsCount: this.seenJobs.size,
        timestamp: new Date().toISOString()
      };

      return { jobs, metrics };

    } finally {
      this.isRunning = false;
    }
  }

  public getStatus(): { 
    isRunning: boolean; 
    lastRunType: RunType; 
    seenJobsCount: number; 
    businessHours: boolean 
  } {
    return {
      isRunning: this.isRunning,
      lastRunType: this.lastRunType,
      seenJobsCount: this.seenJobs.size,
      businessHours: this.isBusinessHours()
    };
  }

  public resetSeenJobs(): void {
    this.seenJobs.clear();
    console.log('🔄 Reed scraper seen jobs cache cleared');
  }
}

export default ReedScraper;
