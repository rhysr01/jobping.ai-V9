import axios from 'axios';
import { classifyEarlyCareer } from './utils.js';

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

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string }[];
  content?: string;
  metadata?: Array<{ name: string; value: string }>;
  company_name?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

// Greenhouse API Configuration - STANDARDIZED
const GREENHOUSE_CONFIG = {
  baseUrl: 'https://boards-api.greenhouse.io/v1/boards',
  
  // EU companies with proven job boards
  companies: [
    'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'capgemini',
    'bain', 'bcg', 'mckinsey', 'oliverwyman', 'rolandberger',
    'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
    'spotify', 'uber', 'airbnb', 'stripe', 'plaid', 'robinhood',
    'unilever', 'loreal', 'nestle', 'danone', 'heineken',
    'hsbc', 'barclays', 'deutschebank', 'bnpparibas', 'santander'
  ],
  
  // Rate limiting (be respectful to Greenhouse)
  requestInterval: 2000, // 2 seconds between requests
  maxRequestsPerCompany: 3, // Max 3 requests per company
  seenJobTTL: 72 * 60 * 60 * 1000 // 72 hours
};

// Career path rotation strategy
type Track = 'A' | 'B' | 'C' | 'D' | 'E';

const TRACK_DEPARTMENTS: Record<Track, string[]> = {
  A: ['Engineering', 'Technology', 'Product'], // Tech focus
  B: ['Consulting', 'Strategy', 'Business Development'], // Consulting focus
  C: ['Data Science', 'Analytics', 'Research'], // Data focus
  D: ['Marketing', 'Sales', 'Customer Success'], // Growth focus
  E: ['Operations', 'Finance', 'Legal'] // Operations focus
};

class GreenhouseScraper {
  private requestCount = 0;
  private lastRequestTime = 0;
  private seenJobs: Map<number, number> = new Map(); // jobId -> timestamp
  private companyCache: Map<string, { lastCheck: number; jobCount: number }> = new Map();

  constructor() {
    this.cleanupSeenJobs();
    // Clean up seen jobs every 12 hours
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - GREENHOUSE_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private getTrackForRun(): Track {
    // Rotate based on hour of day
    const hour = new Date().getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    return tracks[hour % 5];
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < GREENHOUSE_CONFIG.requestInterval) {
      const delay = GREENHOUSE_CONFIG.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(url: string): Promise<GreenhouseResponse> {
    await this.throttleRequest();
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        validateStatus: (status) => status === 200 || status === 404
      });
      
      this.requestCount++;
      
      if (response.status === 404) {
        return { jobs: [] };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Rate limited by Greenhouse, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.makeRequest(url);
      }
      throw error;
    }
  }

  private convertToIngestJob(ghJob: GreenhouseJob, company: string): IngestJob {
    // Build location string
    let location = 'Remote';
    if (ghJob.location?.name) {
      location = ghJob.location.name;
    } else if (ghJob.offices && ghJob.offices.length > 0) {
      location = ghJob.offices[0].name;
    }
    
    // Clean HTML content
    const description = ghJob.content ? this.stripHtmlTags(ghJob.content) : 'Early-career position';
    
    return {
      title: ghJob.title,
      company: company,
      location: location,
      description: description,
      url: ghJob.absolute_url,
      posted_at: ghJob.updated_at || new Date().toISOString(),
      source: 'greenhouse'
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

  private isEarlyCareer(job: GreenhouseJob): boolean {
    const hay = [
      job.title,
      ...(job.departments?.map(d => d.name) ?? []),
      job.content ?? ""
    ].join(" ").toLowerCase();

    const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate)/i;
    const excl = /(senior|staff|principal|lead|manager|director|head|vp|chief|executive)/i;

    return inc.test(hay) && !excl.test(hay);
  }

  private isEU(job: GreenhouseJob): boolean {
    const txt = [
      job.location?.name ?? "",
      ...(job.offices?.map(o => o.name) ?? []),
      job.content ?? ""
    ].join(" ");
    
    const euHints = [
      'UK', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Portugal', 'Italy',
      'Netherlands', 'Belgium', 'Luxembourg', 'Denmark', 'Sweden', 'Norway', 'Finland',
      'Iceland', 'Poland', 'Czech', 'Austria', 'Switzerland', 'Hungary', 'Greece',
      'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
      'Lithuania', 'Amsterdam', 'Rotterdam', 'Eindhoven', 'London', 'Dublin', 'Paris',
      'Berlin', 'Munich', 'Frankfurt', 'Zurich', 'Stockholm', 'Copenhagen', 'Oslo',
      'Helsinki', 'Madrid', 'Barcelona', 'Lisbon', 'Milan', 'Rome', 'Athens', 'Warsaw',
      'Prague', 'Vienna', 'Budapest', 'Bucharest', 'Tallinn', 'Riga', 'Vilnius',
      'Brussels', 'Luxembourg City'
    ];
    
    return euHints.some(hint => new RegExp(`\\b${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(txt)) ||
           /\b(remote[, ]+)?europe\b/i.test(txt);
  }

  private async fetchCompanyJobs(company: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    try {
      // Check if we've hit the rate limit for this company
      const companyInfo = this.companyCache.get(company);
      if (companyInfo && companyInfo.lastCheck > Date.now() - (24 * 60 * 60 * 1000)) {
        console.log(`  ⏰ Skipping ${company} - checked recently`);
        return [];
      }
      
      console.log(`  🔍 Fetching jobs from ${company}...`);
      
      const url = `${GREENHOUSE_CONFIG.baseUrl}/${company}/jobs?content=true`;
      const response = await this.makeRequest(url);
      
      if (response.jobs && response.jobs.length > 0) {
        console.log(`    📊 Found ${response.jobs.length} jobs`);
        
        for (const job of response.jobs) {
          if (!this.seenJobs.has(job.id)) {
            this.seenJobs.set(job.id, Date.now());
            
            // Apply early-career and EU filtering
            if (this.isEarlyCareer(job) && this.isEU(job)) {
              const ingestJob = this.convertToIngestJob(job, company);
              jobs.push(ingestJob);
              console.log(`    ✅ Early-career EU: ${job.title}`);
            } else {
              console.log(`    🚫 Skipped: ${job.title} (not early-career or not EU)`);
            }
          }
        }
        
        // Update company cache
        this.companyCache.set(company, {
          lastCheck: Date.now(),
          jobCount: response.jobs.length
        });
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error fetching ${company}:`, error.message);
    }
    
    return jobs;
  }

  public async scrapeAllCompanies(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const departments = TRACK_DEPARTMENTS[track];
    
    const allJobs: IngestJob[] = [];
    const metrics = {
      track,
      departments: departments.join(', '),
      companiesProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 Greenhouse scraping with Track ${track}`);
    console.log(`📋 Departments: ${departments.join(', ')}`);
    console.log(`🏢 Companies: ${GREENHOUSE_CONFIG.companies.length} total`);

    // Process companies in batches to manage rate limits
    const batchSize = 5;
    const companyBatches = [];
    for (let i = 0; i < GREENHOUSE_CONFIG.companies.length; i += batchSize) {
      companyBatches.push(GREENHOUSE_CONFIG.companies.slice(i, i + batchSize));
    }

    for (const batch of companyBatches) {
      for (const company of batch) {
        try {
          const companyJobs = await this.fetchCompanyJobs(company);
          allJobs.push(...companyJobs);
          metrics.companiesProcessed++;
          metrics.earlyCareerJobs += companyJobs.length;
          
          console.log(`  ✅ ${company}: ${companyJobs.length} early-career EU jobs`);
          
        } catch (error: any) {
          console.error(`  ❌ Error processing ${company}:`, error.message);
          metrics.errors++;
        }
      }
      
      // Small delay between batches
      if (companyBatches.indexOf(batch) < companyBatches.length - 1) {
        console.log('  ⏸️ Brief pause between company batches...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    metrics.totalJobsFound = allJobs.length;
    metrics.requestsUsed = this.requestCount;

    console.log(`\n📊 Greenhouse scraping complete:`);
    console.log(`   🏢 Companies processed: ${metrics.companiesProcessed}/${GREENHOUSE_CONFIG.companies.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   ❌ Errors: ${metrics.errors}`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleCompany(company: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    console.log(`🔍 Greenhouse scraping ${company}...`);
    
    const jobs = await this.fetchCompanyJobs(company);
    const metrics = {
      company,
      jobsFound: jobs.length,
      requestsUsed: this.requestCount
    };

    return { jobs, metrics };
  }

  public getStatus(): any {
    return {
      isRunning: false,
      companiesSupported: GREENHOUSE_CONFIG.companies.length,
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }

  public getSupportedCompanies(): string[] {
    return GREENHOUSE_CONFIG.companies;
  }

  public getDailyStats(): { requestsUsed: number; seenJobsCount: number } {
    return {
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default GreenhouseScraper;
