import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job } from './types.js';
import { atomicUpsertJobs } from '../Utils/jobMatching';
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
import { RobotsCompliance, RespectfulRateLimiter, JOBPING_USER_AGENT } from '../Utils/robotsCompliance';

// Use JobPing-specific user agent for ethical scraping
const USER_AGENTS = [JOBPING_USER_AGENT];

// Use JobPing-specific headers for ethical scraping
const getRandomHeaders = (userAgent: string) => {
  return RobotsCompliance.getJobPingHeaders();
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      
      console.warn(`🔁 Lever retrying ${err?.response?.status || 'unknown error'} in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

export async function scrapeLever(company: {
  name: string;
  url: string;
  platform: 'lever';
  tags?: string[];
}, runId: string): Promise<{ raw: number; eligible: number; careerTagged: number; locationTagged: number; inserted: number; updated: number; errors: string[]; samples: string[] }> {
  const ingestJobs: IngestJob[] = [];
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  // Simplified metrics tracking
  let rawCount = 0;
  let eligibleCount = 0;
  let savedCount = 0;
  const errors: string[] = [];
  const samples: string[] = [];

  try {
    // Check robots.txt compliance before scraping
    const robotsCheck = await RobotsCompliance.isScrapingAllowed(company.url);
    if (!robotsCheck.allowed) {
      console.log(`🚫 Robots.txt disallows scraping for ${company.name}: ${robotsCheck.reason}`);
      errors.push(`Robots.txt disallows: ${robotsCheck.reason}`);
      return {
        raw: 0,
        eligible: 0,
        careerTagged: 0,
        locationTagged: 0,
        inserted: 0,
        updated: 0,
        errors,
        samples: []
      };
    }
    console.log(`✅ Robots.txt allows scraping for ${company.name}`);

    // Wait for respectful rate limiting
    await RespectfulRateLimiter.waitForDomain(new URL(company.url).hostname);

    await sleep(500 + Math.random() * 1500);

    const { data: html } = await backoffRetry(() =>
      axios.get(company.url, {
        headers: getRandomHeaders(userAgent),
        timeout: 15000,
      })
    );

    const $ = cheerio.load(html);
    
    // Try multiple selectors for different Lever layouts
    const jobSelectors = [
      '.posting',                    // Standard Lever
      '.job-posting',               // Alternative layout
      '.position',                  // Custom layout
      '[data-qa="posting"]',        // Data attribute
      '.careers-posting',           // Corporate site
      '.job-item',                  // Simple layout
    ];
    
    let jobElements = $();
    for (const selector of jobSelectors) {
      jobElements = $(selector);
      if (jobElements.length > 0) {
        console.log(`Found ${jobElements.length} jobs using selector: ${selector} at ${company.name}`);
        break;
      }
    }

    if (jobElements.length === 0) {
      console.warn(`⚠️ No jobs found at ${company.name} - trying API fallback`);
      const apiResult = await tryLeverAPI(company, runId, userAgent);
      
      if (apiResult.length > 0) {
        // Convert API results to database format and insert
        const databaseJobs = apiResult.map(convertToDatabaseFormat);
        const result = await atomicUpsertJobs(databaseJobs);
        
        console.log(`✅ Lever API (${company.name}): ${result.inserted} inserted, ${result.updated} updated`);
        
        return {
          raw: apiResult.length,
          eligible: apiResult.length,
          careerTagged: apiResult.length,
          locationTagged: apiResult.length,
          inserted: result.inserted,
          updated: result.updated,
          errors: result.errors,
          samples: apiResult.slice(0, 5).map(job => job.title)
        };
      }
      
      return {
        raw: 0,
        eligible: 0,
        careerTagged: 0,
        locationTagged: 0,
        inserted: 0,
        updated: 0,
        errors: ['No jobs found via API fallback'],
        samples: []
      };
    }

    // Process jobs using new IngestJob format
    for (let i = 0; i < jobElements.length; i++) {
      rawCount++;
      
      try {
        const ingestJob = await processLeverJobElement($, $(jobElements[i]), company, runId, userAgent);
        if (ingestJob) {
          eligibleCount++;
          
          // Check if job should be saved based on north-star rule
          if (shouldSaveJob(ingestJob)) {
            savedCount++;
            ingestJobs.push(ingestJob);
            samples.push(ingestJob.title);
            
            logJobProcessing(ingestJob, 'SAVED', { company: company.name });
          } else {
            logJobProcessing(ingestJob, 'FILTERED', { company: company.name });
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`⚠️ Error processing Lever job at ${company.name}:`, errorMsg);
        errors.push(errorMsg);
      }
    }

    // Convert IngestJobs to database format and insert
    if (ingestJobs.length > 0) {
      try {
        const databaseJobs = ingestJobs.map(convertToDatabaseFormat);
        const result = await atomicUpsertJobs(databaseJobs);
        
        console.log(`✅ Lever DATABASE (${company.name}): ${result.inserted} inserted, ${result.updated} updated, ${result.errors.length} errors`);
        
        if (result.errors.length > 0) {
          console.error('❌ Lever upsert errors:', result.errors.slice(0, 3));
          errors.push(...result.errors);
        }
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'Database error';
        console.error(`❌ Lever database upsert failed for ${company.name}:`, errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Scraped ${savedCount} graduate jobs from ${company.name} (${eligibleCount} eligible, ${rawCount} total)`);
    
    // Log scraping activity for compliance monitoring
    RobotsCompliance.logScrapingActivity('lever', company.url, true);
    
    return {
      raw: rawCount,
      eligible: eligibleCount,
      careerTagged: savedCount,
      locationTagged: savedCount,
      inserted: savedCount,
      updated: 0,
      errors,
      samples
    };
    
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Lever scrape failed for ${company.name}:`, errorMsg);
    
    // Log failed scraping activity for compliance monitoring
    RobotsCompliance.logScrapingActivity('lever', company.url, false);
    
    errors.push(errorMsg);
    
    return {
      raw: rawCount,
      eligible: eligibleCount,
      careerTagged: savedCount,
      locationTagged: savedCount,
      inserted: savedCount,
      updated: 0,
      errors,
      samples
    };
  }
}

async function processLeverJobElement(
  $: cheerio.CheerioAPI, 
  $el: cheerio.Cheerio<any>, 
  company: any, 
  runId: string,
  userAgent: string
): Promise<IngestJob | null> {
  
  // Extract title with multiple fallbacks
  const title = (
    $el.find('.posting-title > h5').text().trim() ||
    $el.find('.posting-title h4, .posting-title h3').text().trim() ||
    $el.find('.job-title, .position-title').text().trim() ||
    $el.find('h5, h4, h3').first().text().trim() ||
    $el.find('a').first().text().trim()
  );

  if (!title) return null;

  // Relaxed relevance filter - include more job types
  const titleLower = title.toLowerCase();
  const descLower = $el.text().toLowerCase();
  const content = `${titleLower} ${descLower}`;
  
  // Skip only clearly senior/management positions
  const isSenior = /\b(senior\s+|sr\.\s+|lead\s+|principal\s+|director|head\s+of|chief|vp|vice\s+president|(5|6|7|8|9|10)\+?\s*years|experienced\s+.*(5|6|7|8|9|10))\b/.test(content);
  
  if (isSenior) return null;

  // Skip remote-only jobs - focus on local/hybrid opportunities for better early-career prospects
  const isRemoteOnly = /\b(remote|100%\s*remote|fully\s*remote|remote\s*only)\b/i.test(content) && 
                     !/\b(hybrid|on-site|office|in-person)\b/i.test(content);
  
  if (isRemoteOnly) return null;

  // Extract URL with better handling
  let jobUrl = $el.find('a').first().attr('href') || '';
  
  if (jobUrl.startsWith('http')) {
    // Already absolute URL
  } else if (jobUrl.startsWith('/')) {
    // Root-relative URL
    jobUrl = `https://jobs.lever.co${jobUrl}`;
  } else if (jobUrl) {
    // Relative URL
    jobUrl = `${company.url.replace(/\/$/, '')}/${jobUrl}`;
  } else {
    // Try to find URL in parent elements
    jobUrl = $el.closest('a').attr('href') || '';
    if (jobUrl.startsWith('/')) {
      jobUrl = `https://jobs.lever.co${jobUrl}`;
    }
  }

  if (!jobUrl || jobUrl === company.url) return null;

  // Extract location with multiple strategies
  const location = extractLeverLocation($, $el);
  
  // Extract department/team with fallbacks
  const department = (
    $el.find('.posting-categories > span').last().text().trim() ||
    $el.find('.department, .team, .category').text().trim() ||
    $el.find('.posting-categories span').eq(1).text().trim() ||
    'General'
  );

  // Scrape job description
  const description = await scrapeLeverJobDescription(jobUrl, userAgent);
  
  // Create simple IngestJob
  const ingestJob: IngestJob = {
    title: title.trim(),
    company: company.name,
    location: location.trim(),
    description: description.trim(),
    url: jobUrl,
    posted_at: new Date().toISOString(), // Simplified date handling
    source: 'lever'
  };

  // Validate the job
  const validation = validateJob(ingestJob);
  if (!validation.valid) {
    console.log(`❌ Invalid job: "${title}" - ${validation.errors.join(', ')}`);
    return null;
  }

  return ingestJob;
}

function extractLeverLocation($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): string {
  // Try multiple location selectors specific to Lever
  const locationSelectors = [
    '.posting-categories > span:first-child',  // Standard Lever location
    '.posting-categories .location',
    '.job-location',
    '.location',
    '.office',
    '.city',
    '[data-location]'
  ];
  
  for (const selector of locationSelectors) {
    const loc = $el.find(selector).text().trim();
    if (loc && loc.length > 0 && loc !== 'Remote') {
      return loc;
    }
  }
  
  // Try to extract from categories span elements
  const categorySpans = $el.find('.posting-categories > span');
  if (categorySpans.length >= 2) {
    const firstSpan = categorySpans.first().text().trim();
    if (firstSpan && !firstSpan.toLowerCase().includes('full') && !firstSpan.toLowerCase().includes('part')) {
      return firstSpan;
    }
  }
  
  // Check for remote indicators in title or nearby text
  const nearbyText = $el.text().toLowerCase();
  if (/\b(remote|distributed|work.from.home)\b/.test(nearbyText)) {
    return 'Remote';
  }
  
  return 'Location not specified';
}

async function scrapeLeverJobDescription(jobUrl: string, userAgent: string): Promise<string> {
  try {
    await sleep(300 + Math.random() * 500); // Respectful delay
    
    const { data: html } = await axios.get(jobUrl, {
      headers: { 
        'User-Agent': userAgent,
        'Referer': 'https://jobs.lever.co/'
      },
      timeout: 10000,
    });
    
    const $ = cheerio.load(html);
    
    // Lever-specific description selectors
    const descriptionSelectors = [
      '.section-wrapper .section:contains("Description")',
      '.posting-content',
      '.section-wrapper',
      '.posting-description',
      '.job-description',
      '.content'
    ];
    
    for (const selector of descriptionSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // For sections containing "Description", get the next content
        if (selector.includes('contains')) {
          const desc = element.nextAll('.section').first().text().trim() ||
                      element.find('.section-body').text().trim() ||
                      element.next().text().trim();
          if (desc && desc.length > 100) return desc;
        } else {
          const desc = element.text().trim();
          if (desc && desc.length > 100) return desc;
        }
      }
    }
    
    // Fallback: get main content
    const mainContent = $('.posting-content, .main-content').text().trim();
    if (mainContent && mainContent.length > 100) {
      return mainContent.slice(0, 1500);
    }
    
    return $('body').text().slice(0, 1000);
    
  } catch (err) {
    console.warn(`Failed to scrape Lever description from ${jobUrl}:`, err);
    return 'Description not available';
  }
}



// Fallback: Try Lever API endpoint
async function tryLeverAPI(company: any, runId: string, userAgent: string): Promise<IngestJob[]> {
  try {
    // Extract company ID from URL
    const companyMatch = company.url.match(/lever\.co\/([^\/]+)/);
    if (!companyMatch) return [];
    
    const companyId = companyMatch[1];
    const apiUrl = `https://api.lever.co/v0/postings/${companyId}?mode=json`;
    
    const { data } = await axios.get(apiUrl, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'application/json'
      },
      timeout: 10000,
    });
    
    if (!Array.isArray(data)) return [];
    
    return data
      .filter((job: any) => {
        const title = job.text?.toLowerCase() || '';
        return /\b(intern|graduate|entry|junior|trainee)\b/.test(title);
      })
      .map((job: any): IngestJob => ({
        title: job.text,
        company: company.name,
        location: job.categories?.location || 'Location not specified',
        description: job.description || 'Description not available',
        url: job.hostedUrl || job.applyUrl,
        posted_at: job.createdAt || new Date().toISOString(),
        source: 'lever'
      }))
      .filter(ingestJob => {
        // Apply north-star rule: save if early-career and in Europe
        return shouldSaveJob(ingestJob);
      });
      
  } catch (err) {
    console.warn(`Lever API fallback failed for ${company.name}:`, err);
    return [];
  }
}

// Test runner
if (require.main === module) {
  const testCompany = {
    name: 'ExampleCompany',
    url: 'https://jobs.lever.co/examplecompany',
    platform: 'lever' as const,
    tags: ['test']
  };

  scrapeLever(testCompany, 'test-run-123')
    .then((result) => {
      console.log(`🧪 Test: ${result.inserted + result.updated} jobs processed`);
      console.log(`📊 LEVER TEST FUNNEL: Raw=${result.raw}, Eligible=${result.eligible}, Inserted=${result.inserted}, Updated=${result.updated}`);
      if (result.samples.length > 0) {
        console.log(`📝 Sample titles: ${result.samples.join(' | ')}`);
      }
      console.log('---');
    })
    .catch(err => console.error('🛑 Test failed:', err));
}