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

interface InfoJobsJob {
  id: string;
  title: string;
  company: {
    name: string;
  };
  city: string;
  province: string;
  description: string;
  url: string;
  creationDate: string;
  updateDate: string;
  experienceMin: string;
  category: {
    value: string;
  };
  salaryMin?: number;
  salaryMax?: number;
  contractType: string;
}

interface InfoJobsResponse {
  offers: InfoJobsJob[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
}

// InfoJobs API Configuration
const INFOJOBS_CONFIG = {
  baseUrl: 'https://api.infojobs.net/api/7/offer',
  token: process.env.INFOJOBS_TOKEN || '',
  // Spanish business hours: 09:00-21:00 local time
  businessHours: {
    start: 9,
    end: 21
  },
  // Hourly rotation for quota management
  rotationInterval: 60 * 60 * 1000, // 1 hour
  // Cities to target (focusing on Spanish cities from target list)
  cities: ['Madrid', 'Barcelona'] as const,
  // Categories to rotate through
  categories: [
    'it', 'finance', 'marketing', 'sales', 'business', 
    'engineering', 'design', 'operations', 'hr', 'legal'
  ] as const,
  // Experience levels for early-career filtering
  experienceLevels: ['no_experience', '0-1_years', '1-2_years'] as const
};

// Rotation strategy for hourly quota management
interface RotationStrategy {
  topOfHour: { category: string; keywords: string };
  twentyPast: { category: string; keywords: string };
  fortyPast: { category: string; keywords: string };
  evening: { category: string; keywords: string };
}

const ROTATION_STRATEGIES: Record<number, RotationStrategy> = {
  // Hour 0 (top of hour)
  0: {
    topOfHour: { category: 'it', keywords: '(junior OR becario OR prácticas)' },
    twentyPast: { category: 'finance', keywords: '(junior OR becario OR recién graduado)' },
    fortyPast: { category: 'marketing', keywords: '(becario OR prácticas OR junior)' },
    evening: { category: 'it', keywords: '(becario OR prácticas OR junior OR recién graduado)' }
  },
  // Hour 1
  1: {
    topOfHour: { category: 'engineering', keywords: '(junior OR becario OR prácticas)' },
    twentyPast: { category: 'business', keywords: '(junior OR becario OR recién graduado)' },
    fortyPast: { category: 'sales', keywords: '(becario OR prácticas OR junior)' },
    evening: { category: 'engineering', keywords: '(becario OR prácticas OR junior OR recién graduado)' }
  },
  // Hour 2
  2: {
    topOfHour: { category: 'design', keywords: '(junior OR becario OR prácticas)' },
    twentyPast: { category: 'operations', keywords: '(junior OR becario OR recién graduado)' },
    fortyPast: { category: 'hr', keywords: '(becario OR prácticas OR junior)' },
    evening: { category: 'design', keywords: '(becario OR prácticas OR junior OR recién graduado)' }
  }
  // Pattern continues for other hours...
};

class InfoJobsScraper {
  private lastRequestTime = 0;
  private seenJobs: Map<string, number> = new Map(); // jobId -> timestamp
  private lastRotationHour = -1;
  private isRunning = false;
  private requestCount = 0;
  private dailyRequestLimit = 100; // Adjust based on your plan

  constructor() {
    this.cleanupSeenJobs();
    // Clean up seen jobs every hour
    setInterval(() => this.cleanupSeenJobs(), 60 * 60 * 1000);
    // Reset daily request count at midnight
    this.scheduleDailyReset();
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.requestCount = 0;
      this.scheduleDailyReset(); // Schedule next reset
    }, timeUntilMidnight);
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= INFOJOBS_CONFIG.businessHours.start && hour < INFOJOBS_CONFIG.businessHours.end;
  }

  private getRotationStrategy(): RotationStrategy {
    const now = new Date();
    const hour = now.getHours();
    
    // Use modulo to cycle through strategies
    const strategyIndex = hour % Object.keys(ROTATION_STRATEGIES).length;
    return ROTATION_STRATEGIES[strategyIndex] || ROTATION_STRATEGIES[0];
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Ensure minimum 1 second between requests
    if (timeSinceLastRequest < 1000) {
      const delay = 1000 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(params: Record<string, any>): Promise<InfoJobsResponse> {
    if (this.requestCount >= this.dailyRequestLimit) {
      throw new Error('Daily request limit exceeded');
    }

    await this.throttleRequest();

    try {
      const response = await axios.get(INFOJOBS_CONFIG.baseUrl, {
        params: {
          province: params.province,
          category: params.category,
          experienceMin: params.experienceMin,
          keyword: params.keyword,
          order: 'updated',
          maxResults: params.maxResults || 50,
          page: params.page || 1,
          ...params
        },
        headers: {
          'Authorization': `Bearer ${INFOJOBS_CONFIG.token}`,
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      this.requestCount++;
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Rate limited by InfoJobs, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second backoff
        return this.makeRequest(params);
      }
      if (error.response?.status === 401) {
        throw new Error('InfoJobs authentication failed - check token');
      }
      throw error;
    }
  }

  private convertToIngestJob(infoJobsJob: InfoJobsJob): IngestJob {
    return {
      title: infoJobsJob.title,
      company: infoJobsJob.company.name,
      location: `${infoJobsJob.city}, ${infoJobsJob.province}`,
      description: infoJobsJob.description,
      url: infoJobsJob.url,
      posted_at: infoJobsJob.creationDate,
      source: 'infojobs'
    };
  }

  private async fetchCityJobs(
    city: 'Madrid' | 'Barcelona', 
    category: string, 
    keywords: string,
    page: number = 1
  ): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];

    try {
      const params = {
        province: city,
        category,
        experienceMin: 'no_experience',
        keyword: keywords,
        order: 'updated',
        maxResults: 50,
        page
      };

      const response = await this.makeRequest(params);
      
      for (const job of response.offers) {
        if (!this.seenJobs.has(job.id)) {
          this.seenJobs.set(job.id, Date.now());
          const ingestJob = this.convertToIngestJob(job);
          jobs.push(ingestJob);
        }
      }

      return jobs;

    } catch (error: any) {
      console.error(`Error fetching ${city} jobs for category ${category}:`, error.message);
      return [];
    }
  }

  public async scrapeCities(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    if (this.isRunning) {
      throw new Error('InfoJobs scraper is already running');
    }

    if (!this.isBusinessHours()) {
      console.log('⏰ Outside business hours, skipping InfoJobs scrape');
      return { jobs: [], metrics: { reason: 'outside_business_hours' } };
    }

    this.isRunning = true;

    try {
      const allJobs: IngestJob[] = [];
      const strategy = this.getRotationStrategy();
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();

      console.log(`🔄 InfoJobs scraping with rotation strategy for hour ${currentHour}`);

      // Determine which rotation to use based on current time
      let rotation: keyof RotationStrategy;
      if (currentMinute < 20) {
        rotation = 'topOfHour';
      } else if (currentMinute < 40) {
        rotation = 'twentyPast';
      } else {
        rotation = 'fortyPast';
      }

      const { category, keywords } = strategy[rotation];

      // Scrape both cities with the current rotation
      for (const city of INFOJOBS_CONFIG.cities) {
        console.log(`📍 Processing ${city} with category ${category} and keywords: ${keywords}`);
        
        const cityJobs = await this.fetchCityJobs(city, category, keywords, 1);
        allJobs.push(...cityJobs);
        
        console.log(`✅ ${city}: ${cityJobs.length} jobs found`);
        
        // Small delay between cities
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Evening pass: broader sweep with page 1 only
      if (currentHour >= 18) { // After 6 PM
        console.log('🌙 Evening pass: broader sweep');
        
        for (const city of INFOJOBS_CONFIG.cities) {
          const eveningJobs = await this.fetchCityJobs(
            city, 
            'it', // Default category for evening
            '(becario OR prácticas OR junior OR recién graduado)',
            1
          );
          
          // Only add jobs we haven't seen
          for (const job of eveningJobs) {
            if (!allJobs.some(existing => existing.url === job.url)) {
              allJobs.push(job);
            }
          }
        }
      }

      const metrics = {
        rotation,
        category,
        keywords,
        citiesProcessed: INFOJOBS_CONFIG.cities.length,
        jobsFound: allJobs.length,
        newJobs: allJobs.length,
        duplicates: 0,
        seenJobsCount: this.seenJobs.size,
        businessHours: true,
        requestsUsed: this.requestCount,
        dailyLimit: this.dailyRequestLimit,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ InfoJobs scraping complete: ${allJobs.length} jobs found`);

      return { jobs: allJobs, metrics };

    } finally {
      this.isRunning = false;
    }
  }

  public async scrapeSingleCity(
    city: 'Madrid' | 'Barcelona', 
    category?: string
  ): Promise<{ jobs: IngestJob[]; metrics: any }> {
    if (this.isRunning) {
      throw new Error('InfoJobs scraper is already running');
    }

    this.isRunning = true;

    try {
      const strategy = this.getRotationStrategy();
      const { category: defaultCategory, keywords } = strategy.topOfHour;
      const targetCategory = category || defaultCategory;

      console.log(`📍 InfoJobs scraping ${city} with category ${targetCategory}`);

      const jobs = await this.fetchCityJobs(city, targetCategory, keywords, 1);
      
      const metrics = {
        city,
        category: targetCategory,
        keywords,
        jobsFound: jobs.length,
        newJobs: jobs.length,
        seenJobsCount: this.seenJobs.size,
        requestsUsed: this.requestCount,
        dailyLimit: this.dailyRequestLimit,
        timestamp: new Date().toISOString()
      };

      return { jobs, metrics };

    } finally {
      this.isRunning = false;
    }
  }

  public getStatus(): { 
    isRunning: boolean; 
    businessHours: boolean; 
    seenJobsCount: number; 
    requestsUsed: number; 
    dailyLimit: number;
    currentRotation: string;
  } {
    const strategy = this.getRotationStrategy();
    return {
      isRunning: this.isRunning,
      businessHours: this.isBusinessHours(),
      seenJobsCount: this.seenJobs.size,
      requestsUsed: this.requestCount,
      dailyLimit: this.dailyRequestLimit,
      currentRotation: `${strategy.topOfHour.category} - ${strategy.topOfHour.keywords}`
    };
  }

  public resetSeenJobs(): void {
    this.seenJobs.clear();
    console.log('🔄 InfoJobs scraper seen jobs cache cleared');
  }

  public setDailyLimit(limit: number): void {
    this.dailyRequestLimit = limit;
    console.log(`📊 InfoJobs daily request limit set to ${limit}`);
  }
}

export default InfoJobsScraper;
