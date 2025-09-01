import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { Job } from './types';
import { atomicUpsertJobs, extractPostingDate, extractProfessionalExpertise, extractCareerPath, extractStartDate } from '../Utils/jobMatching';
import { PerformanceMonitor } from '../Utils/performanceMonitor';
import { FunnelTelemetryTracker, logFunnelMetrics, isEarlyCareerEligible, createRobustJob } from '../Utils/robustJobCreation';
import { CFG, throttle, fetchHtml } from '../Utils/railwayConfig';

// GraduateJobs.com specific configuration
const GRADUATE_JOBS_CONFIG = {
  baseUrl: 'https://www.graduatejobs.com',
  graduateSections: [
    '/graduate-jobs',
    '/new-graduate-jobs', 
    '/graduate-schemes',
    '/graduate-programmes',
    '/entry-level-jobs',
    '/graduate-internships'
  ],
  searchParams: {
    'experience-level': 'graduate',
    'job-type': 'graduate-scheme',
    'entry-level': 'true'
  }
};

// Graduate-specific job categories
const GRADUATE_CATEGORIES = [
  'graduate-scheme',
  'new-graduate', 
  'entry-level',
  'graduate-programme',
  'graduate-internship',
  'trainee-programme',
  'graduate-rotation',
  'graduate-training'
];

// Graduate-specific keywords to look for
const GRADUATE_KEYWORDS = [
  'graduate scheme',
  'graduate programme', 
  'new graduate',
  'entry level',
  'graduate training',
  'rotation programme',
  'graduate internship',
  'trainee programme',
  'graduate development',
  'graduate academy',
  'graduate pathway',
  'graduate stream',
  'graduate cohort',
  'graduate intake',
  'graduate year',
  'graduate class'
];

// Graduate-specific filters
function isGraduateSpecificJob(title: string, description: string, company: string): boolean {
  const content = `${title} ${description} ${company}`.toLowerCase();
  
  // Must contain graduate-specific keywords
  const hasGraduateKeyword = GRADUATE_KEYWORDS.some(keyword => 
    content.includes(keyword.toLowerCase())
  );
  
  // Exclude senior positions
  const seniorKeywords = [
    'senior', 'lead', 'principal', 'director', 'head of', 'manager',
    '5+ years', '7+ years', 'experienced', 'expert', 'senior level'
  ];
  
  const hasSeniorKeyword = seniorKeywords.some(keyword => 
    content.includes(keyword.toLowerCase())
  );
  
  return hasGraduateKeyword && !hasSeniorKeyword;
}

// Extract graduate-specific details
function extractGraduateDetails(description: string): {
  applicationDeadline?: string;
  rotationProgram?: boolean;
  trainingProgram?: boolean;
  startDate?: string;
  programDuration?: string;
  conversionToFullTime?: boolean;
} {
  const details: {
    applicationDeadline?: string;
    rotationProgram: boolean;
    trainingProgram: boolean;
    startDate?: string;
    programDuration?: string;
    conversionToFullTime: boolean;
  } = {
    applicationDeadline: undefined,
    rotationProgram: false,
    trainingProgram: false,
    startDate: undefined,
    programDuration: undefined,
    conversionToFullTime: false
  };
  
  const desc = description.toLowerCase();
  
  // Extract application deadline
  const deadlineMatch = desc.match(/(?:application deadline|closing date|apply by|deadline)[:\s]+([^.\n]+)/i);
  if (deadlineMatch) {
    details.applicationDeadline = deadlineMatch[1].trim();
  }
  
  // Check for rotation program
  details.rotationProgram = /rotation|rotational|rotating/.test(desc);
  
  // Check for training program
  details.trainingProgram = /training programme|training program|development programme|graduate academy/.test(desc);
  
  // Extract start date
  const startMatch = desc.match(/(?:start date|commence|begin|starting)[:\s]+([^.\n]+)/i);
  if (startMatch) {
    details.startDate = startMatch[1].trim();
  }
  
  // Extract program duration
  const durationMatch = desc.match(/(\d+)[\s-]*(?:month|year|week)s?/i);
  if (durationMatch) {
    details.programDuration = durationMatch[0];
  }
  
  // Check for conversion to full-time
  details.conversionToFullTime = /convert|conversion|permanent|full.?time|ftc|permanent role/.test(desc);
  
  return details;
}

// Graduate-specific job URL builder
function buildGraduateJobUrl(section: string, page: number = 1): string {
  const url = new URL(`${GRADUATE_JOBS_CONFIG.baseUrl}${section}`);
  
  // Add graduate-specific search parameters
  Object.entries(GRADUATE_JOBS_CONFIG.searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  // Add pagination
  if (page > 1) {
    url.searchParams.set('page', page.toString());
  }
  
  return url.toString();
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
];

// Enhanced anti-detection headers with rotating IP simulation
const getRandomHeaders = (userAgent: string) => {
  const referrers = [
    'https://www.google.com/',
    'https://www.linkedin.com/jobs/',
    'https://www.glassdoor.com/',
    'https://www.indeed.com/',
    'https://www.ziprecruiter.com/',
    'https://www.simplyhired.com/',
    'https://www.dice.com/',
    'https://www.angel.co/jobs',
    'https://www.wellfound.com/',
    'https://www.otta.com/'
  ];

  const languages = [
    'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,de;q=0.6',
    'en-GB,en;q=0.9',
    'en-CA,en;q=0.9,fr;q=0.8',
    'en-AU,en;q=0.9',
    'en-US,en;q=0.9,zh;q=0.8,ja;q=0.7'
  ];

  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': languages[Math.floor(Math.random() * languages.length)],
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Referer': referrers[Math.floor(Math.random() * referrers.length)],
    'X-Forwarded-For': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    'X-Real-IP': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced Browser Pool with connection pooling and health checks
class SimpleBrowserPool {
  private static browsers: any[] = [];
  private static maxSize = 5;
  private static healthCheckInterval = 300000; // 5 minutes
  private static lastHealthCheck = 0;

  static async getBrowser() {
    // Health check all browsers periodically
    await this.performHealthCheck();
    
    if (this.browsers.length > 0) {
      const browser = this.browsers.pop();
      console.log(`🔄 Reusing browser (${this.browsers.length} remaining)`);
      return browser;
    }

    console.log('🆕 Creating new browser');
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreHTTPSErrors: true,
        timeout: 30000
      });

      return browser;
    } catch (error) {
      console.error('Failed to create browser:', error);
      throw error;
    }
  }

  static async returnBrowser(browser: any) {
    if (!browser) return;
   
    if (this.browsers.length < this.maxSize) {
      try {
        // Reset browser state
        const pages = await browser.pages();
        for (const page of pages.slice(1)) {
          await page.close();
        }
        
        // Clear cookies and cache
        const context = browser.defaultBrowserContext();
        await context.clearPermissionOverrides();
        
        this.browsers.push(browser);
        console.log(`✅ Browser returned to pool (${this.browsers.length}/${this.maxSize})`);
      } catch (error) {
        console.log('⚠️ Error returning browser to pool, closing instead');
        await this.closeBrowser(browser);
      }
    } else {
      await this.closeBrowser(browser);
    }
  }

  private static async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) return;
    
    this.lastHealthCheck = now;
    console.log('🏥 Performing browser pool health check...');
    
    const healthyBrowsers = [];
    for (const browser of this.browsers) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          healthyBrowsers.push(browser);
        } else {
          await this.closeBrowser(browser);
        }
      } catch (error) {
        console.log('⚠️ Unhealthy browser detected, removing from pool');
        await this.closeBrowser(browser);
      }
    }
    
    this.browsers = healthyBrowsers;
    console.log(`🏥 Health check complete: ${this.browsers.length} healthy browsers`);
  }

  private static async closeBrowser(browser: any) {
    try {
      await browser.close();
    } catch (error) {
      console.log('Error closing browser:', error);
    }
  }

  private static removeBrowser(browser: any) {
    const index = this.browsers.indexOf(browser);
    if (index > -1) {
      this.browsers.splice(index, 1);
    }
  }

  static async cleanup() {
    console.log('🧹 Cleaning up browser pool...');
    for (const browser of this.browsers) {
      await this.closeBrowser(browser);
    }
    this.browsers = [];
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

async function backoffRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// EU Cities for GraduateJobs
const EU_CITIES = ['London', 'Madrid', 'Berlin', 'Amsterdam', 'Paris', 'Dublin', 'Stockholm', 'Zurich', 'Barcelona', 'Munich'];

export async function scrapeGraduateJobs(runId: string): Promise<{ raw: number; eligible: number; careerTagged: number; locationTagged: number; inserted: number; updated: number; errors: string[]; samples: string[] }> {
  const jobs: Job[] = [];
  const telemetry = new FunnelTelemetryTracker();
  
  console.log('🎓 Starting GraduateJobs.com scraping (graduate-specific)...');
  
  try {
    // REAL SCRAPING: Target actual graduate job URLs
    const graduateJobUrls = [
      'https://www.graduatejobs.com/graduate-jobs',
      'https://www.graduatejobs.com/graduate-schemes',
      'https://www.graduatejobs.com/new-graduate-jobs',
      'https://www.graduatejobs.com/graduate-programmes',
      'https://www.graduatejobs.com/entry-level-jobs'
    ];
    
    for (const url of graduateJobUrls) {
      console.log(`🎯 Scraping REAL graduate jobs from: ${url}`);
      
      try {
        // Use Railway-compatible HTTP fetching
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        
        console.log(`📄 HTML size: ${html.length} chars`);
        
        // REAL selectors for GraduateJobs.com
        const jobSelectors = [
          '.job-listing',
          '.graduate-job',
          '.job-card',
          '.graduate-scheme',
          '.entry-level-job',
          '.job-item',
          '.position-listing',
          '[data-job-type="graduate"]',
          '.graduate-programme'
        ];
        
        let jobElements = $();
        for (const selector of jobSelectors) {
          const elements = $(selector);
          console.log(`🔍 Selector "${selector}": ${elements.length} elements`);
          if (elements.length > 0) {
            jobElements = elements;
            console.log(`✅ Using selector: ${selector} (found ${elements.length} REAL jobs)`);
            break;
          }
        }
        
        if (jobElements.length === 0) {
          console.log(`⚠️ No jobs found with any selector on ${url}`);
          continue;
        }
        
        // Process REAL graduate jobs
        for (let i = 0; i < jobElements.length; i++) {
          try {
            const element = jobElements.eq(i);
            
            // Extract REAL job data
            const title = element.find('.job-title, .title, h3, .position-title').text().trim();
            const company = element.find('.company-name, .employer, .company').text().trim();
            const location = element.find('.location, .job-location, .job-location').text().trim();
            const description = element.find('.job-description, .description, .job-summary').text().trim();
            const jobUrl = element.find('a').attr('href');
            const postedDate = element.find('.posted-date, .date, .job-date').text().trim();
            
            // Skip if no real data
            if (!title || !company) {
              console.log(`⏭️ Skipping job with missing data: ${title || 'No title'}`);
              continue;
            }
            
            // Skip if not graduate-specific
            if (!isGraduateSpecificJob(title, description, company)) {
              console.log(`⏭️ Skipping non-graduate job: ${title}`);
              continue;
            }
            
            telemetry.recordRaw();
            
            // Extract graduate-specific details from REAL description
            const graduateDetails = extractGraduateDetails(description);
            
            // Create robust job with REAL data
            const jobResult = createRobustJob({
              title,
              company,
              location,
              jobUrl: jobUrl ? (jobUrl.startsWith('http') ? jobUrl : `${GRADUATE_JOBS_CONFIG.baseUrl}${jobUrl}`) : '',
              companyUrl: GRADUATE_JOBS_CONFIG.baseUrl,
              description: `${description}\n\nGraduate Details:\n- Application Deadline: ${graduateDetails.applicationDeadline || 'Not specified'}\n- Rotation Program: ${graduateDetails.rotationProgram ? 'Yes' : 'No'}\n- Training Program: ${graduateDetails.trainingProgram ? 'Yes' : 'No'}\n- Start Date: ${graduateDetails.startDate || 'Not specified'}\n- Program Duration: ${graduateDetails.programDuration || 'Not specified'}\n- Conversion to Full-time: ${graduateDetails.conversionToFullTime ? 'Yes' : 'No'}`,
              postedAt: postedDate,
              runId,
              source: 'graduatejobs',
              isRemote: location.toLowerCase().includes('remote') || location.toLowerCase().includes('work from home')
            });
            
            if (jobResult.job) {
              jobs.push(jobResult.job);
              telemetry.recordEligibility();
              telemetry.addSampleTitle(title);
              console.log(`✅ Added REAL graduate job: ${title} at ${company}`);
            }
            
          } catch (error) {
            console.error(`❌ Error processing job ${i}:`, error);
            telemetry.recordError(`Job processing error: ${error}`);
          }
        }
        
        // Respect rate limiting
        await sleep(3000);
        
      } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error);
        telemetry.recordError(`URL scraping error: ${error}`);
      }
    }
    
    // Process jobs in batches
    if (jobs.length > 0) {
      console.log(`📦 Processing ${jobs.length} graduate jobs...`);
      
      const batches = [];
      for (let i = 0; i < jobs.length; i += 50) {
        batches.push(jobs.slice(i, i + 50));
      }
      
      for (const batch of batches) {
        try {
          const result = await atomicUpsertJobs(batch);
          telemetry.recordInserted();
          console.log(`✅ Processed batch: ${result.inserted} inserted, ${result.updated} updated`);
        } catch (error) {
          console.error(`❌ Error processing batch:`, error);
          telemetry.recordError(`Batch processing error: ${error}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ GraduateJobs scraping failed:', error);
    telemetry.recordError(`Scraping failed: ${error}`);
  }
  
  // Log telemetry
  logFunnelMetrics('graduatejobs', telemetry.getTelemetry());
  
  return telemetry.getTelemetry();
}
