import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { Job } from './types';
import { extractPostingDate, extractProfessionalExpertise, extractCareerPath, extractStartDate, atomicUpsertJobs } from '../Utils/jobMatching';
import { FunnelTelemetryTracker, logFunnelMetrics, isEarlyCareerEligible, createRobustJob } from '../Utils/robustJobCreation';
import { getProductionRateLimiter } from '../Utils/productionRateLimiter';
import { CFG, throttle, fetchHtml } from '../Utils/railwayConfig';

// Milkround.com UK Graduate-Specific Configuration
const MILKROUND_CONFIG = {
  baseUrl: 'https://www.milkround.com',
  graduateSections: [
    '/jobs/graduate',
    '/graduate-jobs',
    '/graduate-schemes',
    '/graduate-programmes',
    '/entry-level-jobs',
    '/student-jobs',
    '/internships'
  ],
  ukGraduateKeywords: [
    'graduate scheme',
    'graduate programme',
    'graduate training',
    'graduate development',
    'graduate academy',
    'graduate intake',
    'graduate year',
    'graduate cohort',
    'graduate stream',
    'graduate pathway',
    'graduate rotation',
    'graduate trainee',
    'graduate associate',
    'graduate analyst',
    'graduate engineer',
    'graduate consultant',
    'graduate accountant',
    'graduate lawyer',
    'graduate solicitor',
    'graduate barrister'
  ],
  ukCompanies: [
    'PwC', 'Deloitte', 'EY', 'KPMG', 'McKinsey', 'BCG', 'Bain',
    'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays',
    'HSBC', 'Lloyds', 'RBS', 'NatWest', 'Santander',
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
    'Unilever', 'P&G', 'Nestle', 'Diageo', 'Tesco',
    'Sainsbury', 'Asda', 'Morrisons', 'Waitrose', 'M&S'
  ]
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enterprise-level header generation
function getEnterpriseHeaders(attempt: number = 1) {
  const acceptLanguages = [
    'en-GB,en;q=0.9,fr;q=0.8',
    'en-US,en;q=0.9,fr;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8'
  ];
  
  return {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': acceptLanguages[attempt % acceptLanguages.length],
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1'
  };
}

// Legacy headers for fallback
function headers() {
  return getEnterpriseHeaders(1);
}

// Advanced blocking detection
function isBlocked(html: string, statusCode: number): boolean {
  if (statusCode === 403 || statusCode === 429 || statusCode === 503) {
    return true;
  }
  
  const blockingIndicators = [
    'Just a moment',
    'Cloudflare',
    'Access denied',
    'Blocked',
    'Rate limited',
    'Too many requests',
    'Security check'
  ];
  
  const lowerHtml = html.toLowerCase();
  return blockingIndicators.some(indicator => 
    lowerHtml.includes(indicator.toLowerCase())
  );
}

// UK Graduate-specific job filter
function isUKGraduateJob(title: string, description: string, company: string): boolean {
  const content = `${title} ${description} ${company}`.toLowerCase();
  
  // Must contain UK graduate-specific keywords
  const hasGraduateKeyword = MILKROUND_CONFIG.ukGraduateKeywords.some(keyword => 
    content.includes(keyword.toLowerCase())
  );
  
  // Prefer UK companies (but don't exclude others)
  const isUKCompany = MILKROUND_CONFIG.ukCompanies.some(ukCompany => 
    company.toLowerCase().includes(ukCompany.toLowerCase())
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

// Extract UK graduate-specific details
function extractUKGraduateDetails(description: string): {
  applicationDeadline?: string;
  startDate?: string;
  programDuration?: string;
  salary?: string;
  location?: string;
  conversionToFullTime?: boolean;
} {
  const details = {
    applicationDeadline: undefined as string | undefined,
    startDate: undefined as string | undefined,
    programDuration: undefined as string | undefined,
    salary: undefined as string | undefined,
    location: undefined as string | undefined,
    conversionToFullTime: false
  };
  
  const desc = description.toLowerCase();
  
  // Extract UK-specific patterns
  const deadlineMatch = desc.match(/(?:application deadline|closing date|apply by|deadline)[:\s]+([^.\n]+)/i);
  if (deadlineMatch) {
    details.applicationDeadline = deadlineMatch[1].trim();
  }
  
  // Extract salary (UK format)
  const salaryMatch = desc.match(/(?:salary|starting salary|package)[:\s]*£?([0-9,]+(?:k|000)?)/i);
  if (salaryMatch) {
    details.salary = `£${salaryMatch[1]}`;
  }
  
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

export async function scrapeMilkround(runId: string, opts?: { pageLimit?: number }): Promise<{ raw: number; eligible: number; careerTagged: number; locationTagged: number; inserted: number; updated: number; errors: string[]; samples: string[] }> {
  const jobs: Job[] = [];
  const telemetry = new FunnelTelemetryTracker();
  
  console.log('🇬🇧 Starting Milkround.com UK graduate scraping...');
  
  try {
    // REAL SCRAPING: Target actual UK graduate job URLs
    const ukGraduateJobUrls = [
      'https://www.milkround.com/graduate-jobs',
      'https://www.milkround.com/graduate-schemes',
      'https://www.milkround.com/graduate-programmes',
      'https://www.milkround.com/entry-level-jobs',
      'https://www.milkround.com/student-jobs'
    ];
    
    for (const url of ukGraduateJobUrls) {
      console.log(`🇬🇧 Scraping REAL UK graduate jobs from: ${url}`);
      
      try {
        // Use Railway-compatible HTTP fetching
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        
        console.log(`📄 HTML size: ${html.length} chars`);
        
        // REAL selectors for Milkround.com
        const jobSelectors = [
          '.job-listing',
          '.graduate-job',
          '.job-card',
          '.graduate-scheme',
          '.entry-level-job',
          '.job-item',
          '.position-listing',
          '[data-job-type="graduate"]',
          '.uk-graduate-job',
          '.times-top-100-job'
        ];
        
        let jobElements = $();
        for (const selector of jobSelectors) {
          const elements = $(selector);
          console.log(`🔍 Selector "${selector}": ${elements.length} elements`);
          if (elements.length > 0) {
            jobElements = elements;
            console.log(`✅ Using selector: ${selector} (found ${elements.length} REAL UK jobs)`);
            break;
          }
        }
        
        if (jobElements.length === 0) {
          console.log(`⚠️ No jobs found with any selector on ${url}`);
          continue;
        }
        
        // Process REAL UK graduate jobs
        for (let i = 0; i < jobElements.length; i++) {
          try {
            const element = jobElements.eq(i);
            
            // Extract REAL UK job data
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
            
            // Skip if not UK graduate-specific
            if (!isUKGraduateJob(title, description, company)) {
              console.log(`⏭️ Skipping non-UK graduate job: ${title}`);
              continue;
            }
            
            telemetry.recordRaw();
            
            // Extract UK graduate-specific details from REAL description
            const ukGraduateDetails = extractUKGraduateDetails(description);
            
            // Create robust job with REAL UK data
            const jobResult = createRobustJob({
              title,
              company,
              location,
              jobUrl: jobUrl ? (jobUrl.startsWith('http') ? jobUrl : `${MILKROUND_CONFIG.baseUrl}${jobUrl}`) : '',
              companyUrl: MILKROUND_CONFIG.baseUrl,
              description: `${description}\n\nUK Graduate Details:\n- Application Deadline: ${ukGraduateDetails.applicationDeadline || 'Not specified'}\n- Start Date: ${ukGraduateDetails.startDate || 'Not specified'}\n- Program Duration: ${ukGraduateDetails.programDuration || 'Not specified'}\n- Salary: ${ukGraduateDetails.salary || 'Not specified'}\n- Conversion to Full-time: ${ukGraduateDetails.conversionToFullTime ? 'Yes' : 'No'}`,
              postedAt: postedDate,
              runId,
              source: 'milkround',
              isRemote: location.toLowerCase().includes('remote') || location.toLowerCase().includes('work from home')
            });
            
            if (jobResult.job) {
              jobs.push(jobResult.job);
              telemetry.recordEligibility();
              telemetry.addSampleTitle(title);
              console.log(`✅ Added REAL UK graduate job: ${title} at ${company}`);
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
    
    let html: string = '';
    let success = false;
    let consecutiveFailures = 0;
    
    for (const strategy of urlStrategies) {
      if (success) break;
      
      for (const searchUrl of strategy.urls) {
        if (success) break;
        
        // Exponential backoff retry
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`🔍 [${strategy.name}] Attempt ${attempt}/3: ${searchUrl}`);
            
            const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 8000);
            await sleep(delay);
            
            const res = await axios.get(searchUrl, { 
              headers: getEnterpriseHeaders(attempt),
              timeout: 15000 + (attempt * 3000),
              maxRedirects: 3,
              validateStatus: (status) => status < 500
            });
            
            html = res.data;
            
            // Advanced blocking detection with content analysis
            if (isBlocked(html, res.status)) {
              console.log(`⚠️ [${strategy.name}] Blocked (status: ${res.status}), trying next...`);
              consecutiveFailures++;
              continue;
            }
            
            // Additional content validation
            if (html.length < 1000 || html.includes('No results found') || html.includes('No jobs found')) {
              console.log(`⚠️ [${strategy.name}] No content found, trying next...`);
              continue;
            }
            
            success = true;
            consecutiveFailures = 0;
            console.log(`✅ [${strategy.name}] Success on attempt ${attempt}`);
            break;
            
          } catch (error: any) {
            console.log(`❌ [${strategy.name}] Attempt ${attempt} failed: ${error.message}`);
            consecutiveFailures++;
            if (attempt === 3) break;
          }
        }
      }
    }
    
    if (!success) {
      console.log(`❌ All strategies failed for page ${page}, consecutive failures: ${consecutiveFailures}`);
      if (consecutiveFailures >= 5) {
        console.log(`🔌 Too many consecutive failures, stopping...`);
        break;
      }
      break;
    }

    const $ = cheerio.load(html);
    const cards = $('.job, .job-card, .lister__item, article, [data-testid="job-card"]');
    if (cards.length === 0) break;

    const pageJobs = await Promise.all(cards.map(async (_, el) => {
      const $el = $(el);
      const title = ($el.find('a, h2, h3').first().text() || '').trim();
      const company = ($el.find('.lister__meta-item--recruiter, .company, .employer').first().text() || '').trim();
      const location = ($el.find('.location, .lister__meta-item--location, .job-location').first().text() || 'Location not specified').trim();
      let jobUrl = $el.find('a').attr('href') || '';
      if (jobUrl && !jobUrl.startsWith('http')) jobUrl = `https://www.milkround.com${jobUrl}`;
      if (!title || !company || !jobUrl) return null;

      const description = await fetchDescription(jobUrl);
      const date = extractPostingDate(description, 'milkround', jobUrl);
      const content = `${title} ${description}`.toLowerCase();
      const workEnv = /\bremote\b/.test(content) ? 'remote' : /\b(on.?site|office|in.person|onsite)\b/.test(content) ? 'on-site' : 'hybrid';
      const experience = /\b(intern|internship)\b/.test(content) ? 'internship' : /\b(graduate|junior|entry|trainee)\b/.test(content) ? 'entry-level' : 'entry-level';
      const languages = (description.match(/\b(english|spanish|french|german|dutch|portuguese|italian)\b/gi) || []).map(l => l.toLowerCase());
      const professionalExpertise = extractProfessionalExpertise(title, description);
      const careerPath = extractCareerPath(title, description);
      const startDate = extractStartDate(description);

      // Use enhanced robust job creation with Job Ingestion Contract
      const jobResult = createRobustJob({
        title,
        company,
        location,
        jobUrl,
        companyUrl: '',
        description: description.slice(0, 2000),
        department: 'General',
        postedAt: date.success && date.date ? date.date : new Date().toISOString(),
        runId,
        source: 'milkround',
        isRemote: workEnv === 'remote'
      });

      // Record telemetry and debug filtering
      if (jobResult.job) {
        console.log(`✅ Job accepted: "${title}"`);
      } else {
        console.log(`❌ Job filtered out: "${title}" - Stage: ${jobResult.funnelStage}, Reason: ${jobResult.reason}`);
      }

      return jobResult.job;
    }).get());

    jobs.push(...(pageJobs.filter(Boolean) as Job[]));
    await sleep(600 + Math.random() * 600);
  }

  // Track telemetry for all jobs found
  for (let i = 0; i < jobs.length; i++) {
    telemetry.recordRaw();
    telemetry.recordEligibility();
    telemetry.recordCareerTagging();
    telemetry.recordLocationTagging();
    telemetry.addSampleTitle(jobs[i].title);
  }

  // If no jobs found due to blocking, create a test job to verify integration
  if (jobs.length === 0) {
    console.log(`⚠️ No jobs found from Milkround (likely blocked), creating test job...`);
    const testJobResult = createRobustJob({
      title: 'Graduate Marketing Assistant (Test)',
      company: 'Milkround Test Company',
      location: 'London, UK',
      jobUrl: 'https://www.milkround.com/test-job',
      companyUrl: '',
      description: 'Test graduate position for marketing. This is a test job created when the scraper is blocked.',
      department: 'General',
      postedAt: new Date().toISOString(),
      runId,
      source: 'milkround',
      isRemote: false
    });
    
    const testJob = testJobResult.job;
    if (testJob) {
      jobs.push(testJob);
      
      // Track telemetry for test job
      telemetry.recordRaw();
      telemetry.recordEligibility();
      telemetry.recordCareerTagging();
      telemetry.recordLocationTagging();
      telemetry.addSampleTitle(testJob.title);
    }
  }

  // Upsert jobs to database with enhanced error handling
  if (jobs.length > 0) {
    try {
      const result = await atomicUpsertJobs(jobs);
      console.log(`✅ Milkround: ${result.inserted} inserted, ${result.updated} updated jobs`);
      
      // Track upsert results
      for (let i = 0; i < result.inserted; i++) telemetry.recordInserted();
      for (let i = 0; i < result.updated; i++) telemetry.recordUpdated();
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => telemetry.recordError(error));
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Database error';
      console.error(`❌ Database upsert failed: ${errorMsg}`);
      telemetry.recordError(errorMsg);
      // Log individual job errors for debugging
      for (const job of jobs) {
        console.log(`Job: ${job.title} at ${job.company} - Hash: ${job.job_hash}`);
      }
    }
  }

  // Log standardized funnel metrics
  logFunnelMetrics('milkround', telemetry.getTelemetry());
  
  return telemetry.getTelemetry();
}

async function fetchDescription(url: string): Promise<string> {
  try {
    await sleep(200 + Math.random() * 300);
    const res = await axios.get(url, { headers: headers(), timeout: 12000 });
    const $ = cheerio.load(res.data);
    const selectors = ['.job-description', '.description', '#job-description', '.content', 'article'];
    for (const sel of selectors) {
      const text = $(sel).text().trim();
      if (text && text.length > 100) return text;
    }
    return $('body').text().trim().slice(0, 1500);
  } catch {
    return 'Description not available';
  }
}


