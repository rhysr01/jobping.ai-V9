import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { Job } from './types';
import { atomicUpsertJobs, extractPostingDate, extractProfessionalExpertise, extractCareerPath, extractStartDate } from '../Utils/jobMatching';
import { createJobCategories } from './types';
import { createRobustJob, FunnelTelemetryTracker, isEarlyCareerEligible } from '../Utils/robustJobCreation';
import { RobotsCompliance, RespectfulRateLimiter, JOBPING_USER_AGENT } from '../Utils/robotsCompliance';
import { PerformanceMonitor } from '../Utils/performanceMonitor';
import { getProductionRateLimiter } from '../Utils/productionRateLimiter';
import { getGraduateEmployersByPlatform, GraduateEmployer } from '../Utils/graduateEmployers';

// Use JobPing-specific user agent for ethical scraping
const USER_AGENTS = [JOBPING_USER_AGENT];

// Use JobPing-specific headers for ethical scraping
const getRandomHeaders = (userAgent: string) => {
  return RobotsCompliance.getJobPingHeaders();
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced Browser Pool with connection pooling and health checks
class SimpleBrowserPool {
  private static browsers: any[] = [];
  private static maxSize = 5;
  private static healthCheckInterval = 300000; // 5 minutes
  private static lastHealthCheck = 0;

  static async getBrowser() {
    // Check if we're in Railway environment
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    const disablePuppeteer = process.env.DISABLE_PUPPETEER === 'true' || isRailway;
    
    if (disablePuppeteer) {
      console.log('🚂 Railway environment detected - using axios fallback');
      return null;
    }
    
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
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process'
        ]
      });
      
      // Set up browser event handlers
      browser.on('disconnected', () => {
        console.log('⚠️ Browser disconnected unexpectedly');
        this.removeBrowser(browser);
      });
      
      return browser;
    } catch (error) {
      console.log('⚠️ Puppeteer not available, falling back to axios');
      return null;
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
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return;
    }
    
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
      console.log('⚠️ Error closing browser:', error);
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

// Circuit breaker pattern for robust error handling
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

// Enhanced retry with jitter and circuit breaker
async function backoffRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  const circuitBreaker = new CircuitBreaker();
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      return await circuitBreaker.execute(fn);
    } catch (err: any) {
      attempt++;
      
      // Don't retry on certain errors
      if (err?.response?.status === 404 || err?.response?.status === 401) {
        throw err;
      }
      
      if (attempt > maxRetries) {
        throw err;
      }
      
      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.warn(`🔁 Retrying ${err?.response?.status || 'unknown error'} in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

export async function scrapeGreenhouse(runId: string, opts?: { pageLimit?: number }): Promise<{ raw: number; eligible: number; careerTagged: number; locationTagged: number; inserted: number; updated: number; errors: string[]; samples: string[] }> {
  const telemetry = new FunnelTelemetryTracker();
  
  console.log('🎯 Starting Greenhouse scraper with CURATED graduate employers...');
  
  // Get ONLY companies that actually have graduate programs
  const graduateEmployers = getGraduateEmployersByPlatform('greenhouse');
  console.log(`📋 Found ${graduateEmployers.length} curated graduate employers on Greenhouse`);
  
  for (const employer of graduateEmployers) {
    console.log(`🏢 Scraping graduate jobs from: ${employer.name}`);
    
    try {
      // Check robots.txt compliance before scraping
      const robotsCheck = await RobotsCompliance.isScrapingAllowed(employer.url);
      if (!robotsCheck.allowed) {
        console.log(`🚫 Robots.txt disallows scraping for ${employer.name}: ${robotsCheck.reason}`);
        telemetry.recordError(`Robots.txt disallows: ${robotsCheck.reason}`);
        continue;
      }
      console.log(`✅ Robots.txt allows scraping for ${employer.name}`);

      // Wait for respectful rate limiting
      await RespectfulRateLimiter.waitForDomain(new URL(employer.url).hostname);

      // Intelligent platform-specific rate limiting
      const delay = await getProductionRateLimiter().getScraperDelay('greenhouse');
      console.log(`⏱️ Greenhouse: Waiting ${delay}ms before scraping ${employer.name}`);
      await sleep(delay);

      // Build Greenhouse URL for this specific employer
      const greenhouseUrl = `https://boards.greenhouse.io/embed/job_board?for=company&b=https://boards.greenhouse.io/company&company=${employer.name.toLowerCase().replace(/\s+/g, '')}`;
      
      console.log(`🔗 Scraping: ${greenhouseUrl}`);
      
      let html: string;
      const browser = await SimpleBrowserPool.getBrowser();
      
      if (browser) {
        // Use browser pool for enhanced scraping
        console.log(`🌐 Using browser pool for ${employer.name} scraping`);
        const page = await browser.newPage();
        await page.setUserAgent(userAgent);
        await page.goto(greenhouseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        html = await page.content();
        await page.close();
      } else {
        // Fallback to axios
        console.log(`📡 Using axios fallback for ${employer.name} scraping`);
        const response = await backoffRetry(() =>
          axios.get(greenhouseUrl, {
            headers: getRandomHeaders(userAgent),
            timeout: 15000,
          })
        );
        html = response.data;
        
                 // Check for blocks/rate limits
         if (response.status === 429 || response.status === 403) {
          console.warn(`🚨 Block detected for ${employer.name}! Status: ${response.status}`);
          await getProductionRateLimiter().getScraperDelay('greenhouse', true);
      }
    }

    const $ = cheerio.load(html);
    
    console.log(`🌐 HTML size: ${html.length} chars, Title: ${$('title').text()}`);
    
    // Try multiple selectors for different Greenhouse layouts
    const jobSelectors = [
      '.style_result__abf_o',    // Current Greenhouse (2024+)
      'li[data-object-id]',      // Current with data attributes
      '.styles_card__59ahF',     // Current card layout
      '.opening',                // Legacy Standard Greenhouse
      '.job-post',              // Custom layout 1
      '.position',              // Custom layout 2
      '[data-job-id]',          // Data attribute
      '.careers-job',           // Alternative
    ];
    
    let jobElements = $();
    for (const selector of jobSelectors) {
      const elements = $(selector);
      console.log(`🔍 Selector "${selector}": ${elements.length} elements`);
      if (elements.length > 0) {
        jobElements = elements;
        console.log(`✅ Using selector: ${selector} (found ${elements.length} jobs)`);
        break;
      }
    }

    if (jobElements.length === 0) {
      console.warn(`⚠️ No jobs found at ${company.name} - trying JSON endpoint`);
      const apiJobs = await tryGreenhouseAPI(company, runId, userAgent);
      
      // For API fallback, create basic telemetry
      if (apiJobs.length > 0) {
        telemetry.recordRaw(); // At least 1 raw job was found
        telemetry.recordEligibility();
        telemetry.recordCareerTagging();
        telemetry.recordLocationTagging();
        
        // Add sample titles
        apiJobs.slice(0, 5).forEach(job => telemetry.addSampleTitle(job.title));
        
        // Track database operations (assuming all get inserted since it's new)
        for (let i = 0; i < apiJobs.length; i++) {
          telemetry.recordInserted();
        }
      }
      
      telemetry.logTelemetry(`Greenhouse-${company.name}`);
      return telemetry.getTelemetry();
    }
    
    console.log(`🔍 Found ${jobElements.length} job elements at ${company.name}`);

    const processedJobs = await Promise.all(
      jobElements.map(async (_, el) => {
        try {
          return await processJobElement($, $(el), company, runId, userAgent, telemetry);
        } catch (err) {
          console.warn(`⚠️ Error processing job at ${company.name}:`, err);
          return null;
        }
      }).get()
    );

    const validJobs = processedJobs.filter((job): job is Job => job !== null);
    
    // CRITICAL: Insert jobs into database
    if (validJobs.length > 0) {
      try {
        const result = await atomicUpsertJobs(validJobs);
        
        // Update telemetry with upsert results
        for (let i = 0; i < result.inserted; i++) telemetry.recordInserted();
        for (let i = 0; i < result.updated; i++) telemetry.recordUpdated();
        
        console.log(`✅ Greenhouse DATABASE (${company.name}): ${result.inserted} inserted, ${result.updated} updated, ${result.errors.length} errors`);
        if (result.errors.length > 0) {
          console.error('❌ Greenhouse upsert errors:', result.errors.slice(0, 3));
          result.errors.forEach(error => telemetry.recordError(error));
        }
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'Database error';
        console.error(`❌ Greenhouse database upsert failed for ${company.name}:`, errorMsg);
        telemetry.recordError(errorMsg);
      }
    }
    
    // Log telemetry for this company
    telemetry.logTelemetry(`Greenhouse-${company.name}`);
    
    console.log(`✅ Scraped ${validJobs.length} graduate jobs from ${company.name}`);
    
    // Log scraping activity for compliance monitoring
    RobotsCompliance.logScrapingActivity('greenhouse', company.url, true);
    
    // Track performance
    PerformanceMonitor.trackDuration(`greenhouse_scraping_${company.name}`, scrapeStart);
    
    return telemetry.getTelemetry();
    
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Greenhouse scrape failed for ${company.name}:`, errorMsg);
    
    // Log failed scraping activity for compliance monitoring
    RobotsCompliance.logScrapingActivity('greenhouse', company.url, false);
    
    PerformanceMonitor.trackDuration(`greenhouse_scraping_${company.name}`, scrapeStart);
    telemetry.recordError(errorMsg);
    return telemetry.getTelemetry();
  } finally {
    // Return browser to pool
    await SimpleBrowserPool.returnBrowser(browser);
  }
}

async function processJobElement(
  $: cheerio.CheerioAPI, 
  $el: cheerio.Cheerio<any>, 
  company: any, 
  runId: string,
  userAgent: string,
  telemetry?: FunnelTelemetryTracker
): Promise<Job | null> {
  
  // Extract title with multiple fallbacks for current and legacy Greenhouse
  const title = (
    $el.find('h2.style_heading__Gnr_z').first().text().trim() ||           // Current Greenhouse
    $el.find('.mds-typography-display-expressive-200').first().text().trim() || // Current Greenhouse alt
    $el.find('a').first().text().trim() ||                                 // Legacy link text
    $el.find('h3, h4, .job-title, [data-title]').first().text().trim() ||  // Legacy selectors
    $el.text().split('\n')[0]?.trim()                                      // Fallback
  );

  if (!title) {
    console.log(`⚠️ No title found for job element`);
    return null;
  }
  
  console.log(`📝 Processing job: "${title}"`);

  // Record raw job
  telemetry?.recordRaw();
  telemetry?.addSampleTitle(title);

  // Extract URL with better handling for current and legacy Greenhouse
  let jobUrl = (
    $el.find('a.styles_link__3GJit').first().attr('href') ||     // Current Greenhouse
    $el.find('a[href*="/career/"]').first().attr('href') ||      // Current Greenhouse alt
    $el.find('a').first().attr('href') ||                       // Legacy
    ''
  );
  
  if (jobUrl.startsWith('/')) {
    const baseUrl = new URL(company.url).origin;
    jobUrl = baseUrl + jobUrl;
  } else if (!jobUrl.startsWith('http')) {
    jobUrl = company.url.replace(/\/$/, '') + '/' + jobUrl;
  }

  // Extract location with multiple strategies
  const location = extractLocation($, $el);
  
  // Extract department/category
  const department = (
    $el.closest('.department').find('h3').text().trim() ||
    $el.find('.department, .team, .category').text().trim() ||
    'General'
  );

  // Scrape job description
  const description = await scrapeJobDescription(jobUrl, userAgent);
  
  // Try to extract real posting date from the job page
  const dateExtraction = extractPostingDate(
    description, 
    'greenhouse', 
    jobUrl
  );
  
  const postedAt = dateExtraction.success && dateExtraction.date 
    ? dateExtraction.date 
    : new Date().toISOString();
  
  // Use enhanced robust job creation with Job Ingestion Contract
  const jobResult = createRobustJob({
    title,
    company: company.name,
    location,
    jobUrl,
    companyUrl: company.url,
    description,
    department,
    postedAt,
    runId,
    source: 'greenhouse',
    isRemote: /\b(remote|100%\s*remote|fully\s*remote|remote\s*only)\b/i.test(`${title} ${description}`),
    platformId: jobUrl.match(/greenhouse\.io\/[^\/]+\/jobs\/(\d+)/)?.[1] // Extract Greenhouse job ID
  });

  // Record telemetry and debug filtering
  if (jobResult.job) {
    telemetry?.recordEligibility();
    telemetry?.recordCareerTagging();
    telemetry?.recordLocationTagging();
    console.log(`✅ Job accepted: "${title}"`);
  } else {
    console.log(`❌ Job filtered out: "${title}" - Stage: ${jobResult.funnelStage}, Reason: ${jobResult.reason}`);
  }

  return jobResult.job;
}

function extractLocation($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): string {
  // Try multiple location selectors for current and legacy Greenhouse
  const locationSelectors = [
    '.mds-typography-label',      // Current Greenhouse location
    '.style_meta__HadIn span',    // Current Greenhouse meta
    '.location',                  // Legacy
    '.job-location',             // Legacy
    '.office',                   // Legacy
    '.city',                     // Legacy
    '[data-location]'            // Legacy
  ];
  
  for (const selector of locationSelectors) {
    const loc = $el.find(selector).first().text().trim();
    if (loc && loc !== '') {
      // Clean up location text (remove workplace type info)
      const cleanLoc = loc.split('|')[0].trim();
      if (cleanLoc && cleanLoc !== '') return cleanLoc;
    }
  }
  
  // Try parent container for legacy layouts
  const parentLoc = $el.closest('.opening, .job-post').find('.location').text().trim();
  if (parentLoc) return parentLoc;
  
  return 'Location not specified';
}

async function scrapeJobDescription(jobUrl: string, userAgent: string): Promise<string> {
  try {
    await sleep(200 + Math.random() * 300); // Small delay between requests
    
    const { data: html } = await axios.get(jobUrl, {
      headers: { 'User-Agent': userAgent },
      timeout: 10000,
    });
    
    const $ = cheerio.load(html);
    
    // Try multiple description selectors
    const descriptionSelectors = [
      '#job-description',
      '.job-description',
      '.content',
      '.job-content',
      '[data-description]'
    ];
    
    for (const selector of descriptionSelectors) {
      const desc = $(selector).text().trim();
      if (desc && desc.length > 100) {
        return desc;
      }
    }
    
    return $('body').text().slice(0, 1000); // Fallback
    
  } catch (err) {
    console.warn(`Failed to scrape description from ${jobUrl}:`, err);
    return 'Description not available';
  }
}

function analyzeJobContent(title: string, description: string) {
  const content = `${title} ${description}`.toLowerCase();
  
  // Determine experience level
  let experienceLevel = 'entry-level';
  if (/\b(intern|internship)\b/.test(content)) experienceLevel = 'internship';
  else if (/\b(graduate|grad)\b/.test(content)) experienceLevel = 'graduate';
  else if (/\b(junior|entry)\b/.test(content)) experienceLevel = 'entry-level';
  
  // Determine work environment
  let workEnv = 'hybrid';
  if (/\b(remote|work.from.home|distributed)\b/.test(content)) workEnv = 'remote';
  else if (/\b(on.?site|office|in.person)\b/.test(content)) workEnv = 'office';
  
  // Extract language requirements
  const languages: string[] = [];
  const langMatches = content.match(/\b(english|spanish|french|german|dutch|portuguese|italian)\b/g);
  if (langMatches) {
    languages.push(...[...new Set(langMatches)]);
  }
  
  // Determine level category
  const level = experienceLevel === 'internship' ? 'internship' : 
                experienceLevel === 'graduate' ? 'graduate' : 'entry-level';
  
  // Extract professional expertise using the new function
  const professionalExpertise = extractProfessionalExpertise(title, description);
  
  // Extract career path using the new function
  const careerPath = extractCareerPath(title, description);
  
  // Extract start date using the new function
  const startDate = extractStartDate(description);
  
  return {
    experienceLevel,
    workEnv,
    languages,
    level,
    professionalExpertise,
    careerPath,
    startDate
  };
}

// Fallback: Try Greenhouse API endpoint
async function tryGreenhouseAPI(company: any, runId: string, userAgent: string): Promise<Job[]> {
  try {
    const apiUrl = company.url.replace(/\/$/, '') + '/jobs.json';
    
    const { data } = await axios.get(apiUrl, {
      headers: { 'User-Agent': userAgent },
      timeout: 10000,
    });
    
    if (!data.jobs || !Array.isArray(data.jobs)) return [];
    
    return data.jobs
      .filter((job: any) => {
        const title = job.title?.toLowerCase() || '';
        return /\b(intern|graduate|entry|junior|trainee)\b/.test(title);
      })
      .map((job: any) => {
        // Try to extract posting date from job data
        const postedAt = job.updated_at || job.created_at || new Date().toISOString();
        
        return {
          title: job.title,
          company: company.name,
          location: job.location?.name || 'Location not specified',
          job_url: job.absolute_url,
          description: job.content || 'Description not available',
          categories: createJobCategories('unknown', [job.departments?.[0]?.name || 'General']),
          experience_required: 'entry-level',
          work_environment: 'hybrid',
          language_requirements: [],
          source: 'greenhouse',
          job_hash: crypto.createHash('md5').update(`${job.title}-${company.name}-${job.absolute_url}`).digest('hex'),
          posted_at: postedAt,
          scraper_run_id: runId,
          company_profile_url: company.url,
          created_at: new Date().toISOString(),
          extracted_posted_date: job.updated_at || job.created_at,
          // Add missing required fields
          professional_expertise: '',
          start_date: '',
          visa_status: '',
          entry_level_preference: '',
          career_path: '',
        };
      });
      
  } catch (err) {
    console.warn(`API fallback failed for ${company.name}:`, err);
    return [];
  }
}