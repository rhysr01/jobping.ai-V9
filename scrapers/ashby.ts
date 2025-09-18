// ✅ Ashby Scraper - EU-Focused Companies
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

interface AshbyJobPosting {
  id: string;
  title: string;
  teamId: string;
  locationId: string;
  location: {
    locationName: string;
    address?: string;
  };
  employmentType: string;
  descriptionHtml: string;
  publishedDate: string;
  updatedDate: string;
  applicationUrl: string;
  departmentName?: string;
  isRemote: boolean;
  compensation?: {
    salary?: {
      min: number;
      max: number;
      currency: string;
    };
  };
}

interface AshbyCompany {
  name: string;
  boardId: string;
  priority: 'high' | 'medium' | 'low';
  euOffices?: string[];
}

// ✅ Ashby Configuration
const ASHBY_CONFIG = {
  baseUrl: 'https://api.ashbyhq.com/posting-api/job-board',
  
  // EU-focused companies using Ashby
  companies: [
    { name: 'Stripe', boardId: 'stripe', priority: 'high' as const, euOffices: ['Dublin', 'London', 'Amsterdam', 'Berlin'] },
    { name: 'Notion', boardId: 'notion', priority: 'high' as const, euOffices: ['Dublin', 'London'] },
    { name: 'Linear', boardId: 'linear', priority: 'medium' as const, euOffices: ['Remote'] },
    { name: 'Loom', boardId: 'loom', priority: 'medium' as const, euOffices: ['London', 'Dublin'] },
    { name: 'Revolut', boardId: 'revolut', priority: 'high' as const, euOffices: ['London', 'Berlin', 'Amsterdam', 'Dublin'] },
    { name: 'Monzo', boardId: 'monzo', priority: 'high' as const, euOffices: ['London', 'Dublin'] },
    { name: 'N26', boardId: 'n26', priority: 'high' as const, euOffices: ['Berlin', 'Barcelona', 'Vienna'] },
    { name: 'Klarna', boardId: 'klarna', priority: 'high' as const, euOffices: ['Stockholm', 'Berlin', 'Amsterdam'] },
    { name: 'Spotify', boardId: 'spotify', priority: 'high' as const, euOffices: ['Stockholm', 'London', 'Amsterdam', 'Berlin'] },
    { name: 'Figma', boardId: 'figma', priority: 'medium' as const, euOffices: ['London', 'Amsterdam'] },
    { name: 'Canva', boardId: 'canva', priority: 'medium' as const, euOffices: ['Dublin'] },
    { name: 'GitLab', boardId: 'gitlab', priority: 'high' as const, euOffices: ['Remote'] },
    { name: 'Buffer', boardId: 'buffer', priority: 'medium' as const, euOffices: ['Remote'] },
    { name: 'Zapier', boardId: 'zapier', priority: 'medium' as const, euOffices: ['Remote'] },
    { name: 'Doist', boardId: 'doist', priority: 'low' as const, euOffices: ['Remote'] }
  ],
  
  // Rate limiting
  requestInterval: 1000, // 1 second between requests (be respectful)
  seenJobTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxRetries: 3
};

class AshbyScraper {
  private requestCount = 0;
  private lastRequestTime = 0;
  private seenJobs: Map<string, number> = new Map();

  constructor() {
    this.cleanupSeenJobs();
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - ASHBY_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < ASHBY_CONFIG.requestInterval) {
      const delay = ASHBY_CONFIG.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(url: string, retries = 0): Promise<AshbyJobPosting[]> {
    await this.throttleRequest();

    try {
      console.log(`🔗 Ashby API request: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      this.requestCount++;
      
      console.log(`📊 Ashby API response: ${response.data?.length || 0} jobs found`);
      
      return response.data || [];

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Ashby rate limited, backing off...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (retries < ASHBY_CONFIG.maxRetries) {
          return this.makeRequest(url, retries + 1);
        }
      }
      
      if (error.response?.status === 404) {
        console.warn(`⚠️ Company board not found: ${url}`);
        return [];
      }
      
      console.error('❌ Ashby API error:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      
      if (retries < ASHBY_CONFIG.maxRetries) {
        console.log(`🔄 Retrying request (${retries + 1}/${ASHBY_CONFIG.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest(url, retries + 1);
      }
      
      throw error;
    }
  }

  private convertToIngestJob(ashbyJob: AshbyJobPosting, companyName: string): IngestJob {
    // Clean HTML from description
    const cleanDescription = ashbyJob.descriptionHtml
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();

    return {
      title: ashbyJob.title,
      company: companyName,
      location: ashbyJob.location.locationName,
      description: cleanDescription,
      url: ashbyJob.applicationUrl,
      posted_at: ashbyJob.publishedDate,
      source: 'ashby'
    };
  }

  private isEUJob(ashbyJob: AshbyJobPosting, company: AshbyCompany): boolean {
    const location = ashbyJob.location.locationName.toLowerCase();
    
    // Skip remote per policy
    if (ashbyJob.isRemote || /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(location)) {
      return false;
    }
    
    // Check EU office locations
    if (company.euOffices) {
      return company.euOffices.some(office => 
        location.includes(office.toLowerCase())
      );
    }
    
    // Check for EU cities/countries in location
    const euPatterns = [
      'dublin', 'london', 'berlin', 'amsterdam', 'paris', 'madrid', 'munich',
      'stockholm', 'zurich', 'copenhagen', 'vienna', 'brussels', 'prague',
      'warsaw', 'barcelona', 'milan', 'rome', 'lisbon', 'athens',
      'ireland', 'united kingdom', 'germany', 'netherlands', 'france',
      'spain', 'sweden', 'switzerland', 'denmark', 'austria', 'belgium',
      'czech republic', 'poland', 'italy', 'portugal', 'greece'
    ];
    
    return euPatterns.some(pattern => location.includes(pattern));
  }

  private async fetchCompanyJobs(company: AshbyCompany): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    console.log(`🏢 Fetching jobs from ${company.name} (${company.boardId})`);

    try {
      const url = `${ASHBY_CONFIG.baseUrl}/${company.boardId}`;
      const ashbyJobs = await this.makeRequest(url);
      
      if (!ashbyJobs || ashbyJobs.length === 0) {
        console.log(`📭 No jobs found for ${company.name}`);
        return jobs;
      }

      console.log(`📊 Found ${ashbyJobs.length} jobs from ${company.name}`);

      for (const ashbyJob of ashbyJobs) {
        if (!this.seenJobs.has(ashbyJob.id)) {
          this.seenJobs.set(ashbyJob.id, Date.now());
          
          try {
            // Check if it's an EU job
            if (!this.isEUJob(ashbyJob, company)) {
              console.log(`🚫 Skipped non-EU: ${ashbyJob.title} at ${company.name} (${ashbyJob.location.locationName})`);
              continue;
            }
            
            const ingestJob = this.convertToIngestJob(ashbyJob, company.name);
            
            const isEarlyCareer = classifyEarlyCareer(ingestJob);
            if (isEarlyCareer) {
              jobs.push(ingestJob);
              console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
            } else {
              console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
            }
          } catch (error) {
            console.warn(`Failed to process job ${ashbyJob.id}:`, error);
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error fetching jobs from ${company.name}:`, error.message);
    }

    return jobs;
  }

  public async scrapeAllCompanies(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const allJobs: IngestJob[] = [];
    
    const metrics = {
      companiesProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 Ashby scraping - EU-Focused Companies`);
    console.log(`🏢 Target companies: ${ASHBY_CONFIG.companies.length}`);

    try {
      // Process companies by priority
      const sortedCompanies = ASHBY_CONFIG.companies.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const company of sortedCompanies) {
        try {
          console.log(`\n🏢 Processing ${company.name} (${company.priority} priority)...`);
          
          const companyJobs = await this.fetchCompanyJobs(company);
          allJobs.push(...companyJobs);
          
          metrics.companiesProcessed++;
          metrics.earlyCareerJobs += companyJobs.length;

          console.log(`✅ ${company.name}: ${companyJobs.length} early-career EU jobs found`);

        } catch (error: any) {
          console.error(`❌ Error processing ${company.name}:`, error.message);
          metrics.errors++;
          
          // If we get repeated errors, wait longer before continuing
          if (error.response?.status >= 400) {
            console.log('⏸️ API error encountered, waiting 10s before continuing...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error in Ashby scraping:`, error.message);
      metrics.errors++;
    }

    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    metrics.totalJobsFound = uniqueJobs.length;
    metrics.earlyCareerJobs = uniqueJobs.length;
    metrics.requestsUsed = this.requestCount;

    console.log(`\n📊 Ashby scraping complete:`);
    console.log(`   🏢 Companies processed: ${metrics.companiesProcessed}/${ASHBY_CONFIG.companies.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);

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
    return {
      isRunning: false,
      companiesSupported: ASHBY_CONFIG.companies.length,
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }

  public getDailyStats(): { 
    requestsUsed: number; 
    seenJobsCount: number;
  } {
    return {
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default AshbyScraper;
